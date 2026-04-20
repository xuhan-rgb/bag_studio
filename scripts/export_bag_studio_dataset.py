#!/usr/bin/env python3
"""
导出一个“Foxglove-lite / Bag Studio”离线数据集：
- 自动提取 ROS 消息中的数值字段用于作图
- 保留字符串字段，支持前端做 regex / JSON / key=value 提取
- 识别 odom 轨迹，并支持前端指定 odom->global 变换后绘制
- 对压缩图像 topic 直接抽帧，供前端按时间轴联动查看

运行环境：必须在 ROS2 容器里执行。
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import sqlite3
import tempfile
import yaml
from collections import defaultdict
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import rclpy
from rclpy.serialization import deserialize_message
from rosidl_runtime_py.utilities import get_message
from PIL import Image

SKIP_TOPIC_TYPES = {
    "sensor_msgs/msg/PointCloud2",
    "sensor_msgs/msg/CameraInfo",
}

# 进度上报：由 --progress-file 决定是否启用；server.py 用该文件给前端做进度条。
# 采用 read-modify-write，避免覆盖 server.py 已写入的 bag_path / fingerprint 等字段。
_PROGRESS_FILE: Optional[Path] = None


def _update_progress(**fields: Any) -> None:
    if _PROGRESS_FILE is None:
        return
    try:
        existing: Dict[str, Any] = {}
        if _PROGRESS_FILE.exists():
            try:
                existing = json.loads(_PROGRESS_FILE.read_text(encoding="utf-8")) or {}
            except Exception:
                existing = {}
        existing.update(fields)
        _PROGRESS_FILE.write_text(
            json.dumps(existing, ensure_ascii=False), encoding="utf-8"
        )
    except Exception:
        pass
IMAGE_TOPIC_TYPES = {
    "sensor_msgs/msg/Image",
    "sensor_msgs/msg/CompressedImage",
}
DEFAULT_TEMP_DATA_ROOT = Path(tempfile.gettempdir()) / "bag_studio_live"


MAX_LIST_FLATTEN = 16
STREAM_MAX_TEXT_SAMPLES = 5000
ODOM_TYPE_CANDIDATES = {
    "nav_msgs/msg/Odometry",
}

DEFAULT_STRING_PRESETS = [
    {
        "id": "regex_first_float",
        "label": "regex · 抽第一个浮点数",
        "parser_mode": "regex",
        "pattern": "([-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?)",
        "capture": "1",
        "help": "适合日志里直接带数字，例如 'distance 7.88 m'",
    },
    {
        "id": "regex_kv_distance",
        "label": "regex · distance=xxx",
        "parser_mode": "regex",
        "pattern": "distance\\s*[:=]\\s*([-+]?\\d*\\.?\\d+)",
        "capture": "1",
        "help": "从 `distance=7.88` / `distance: 7.88` 这种文本抽数值",
    },
    {
        "id": "kv_generic",
        "label": "key=value · 指定 key",
        "parser_mode": "kv",
        "pattern": "distance",
        "capture": "",
        "help": "只需填写 key 名，支持 `,`/`;`/`|`/空格 分隔的 key=value 日志",
    },
    {
        "id": "json_path_value",
        "label": "json path · .metrics.value",
        "parser_mode": "json",
        "pattern": "metrics.value",
        "capture": "",
        "help": "字符串内容是 JSON 时，按 `a.b[0].c` 取出数值",
    },
    {
        "id": "regex_ts_ms",
        "label": "regex · 抽毫秒时间戳",
        "parser_mode": "regex",
        "pattern": "ts_ms\\s*[:=]\\s*(\\d+)",
        "capture": "1",
        "help": "常见于把 Unix 时间戳塞进字符串的调试日志",
    },
]


def ros_stamp_to_sec(stamp: Any) -> Optional[float]:
    if stamp is None:
        return None
    if getattr(stamp, "sec", 0) == 0 and getattr(stamp, "nanosec", 0) == 0:
        return None
    return float(stamp.sec) + float(stamp.nanosec) * 1e-9


def to_iso8601(ts_sec: Optional[float]) -> Optional[str]:
    if ts_sec is None:
        return None
    return datetime.fromtimestamp(ts_sec, tz=timezone.utc).astimezone().isoformat(timespec="milliseconds")


def sanitize_dataset_id(value: str) -> str:
    cleaned = []
    for ch in value:
        if ch.isalnum() or ch in {"-", "_", "."}:
            cleaned.append(ch)
        else:
            cleaned.append("_")
    result = "".join(cleaned).strip("._")
    return result or "bag_studio_dataset"


def ensure_clean_output_dir(path: Path, force: bool) -> None:
    if not path.exists():
        return
    if not force:
        raise FileExistsError(f"Output dir already exists: {path} (use --force to overwrite)")
    shutil.rmtree(path)


def load_metadata_summary(bag_path: Path) -> Dict[str, Any]:
    metadata_path = bag_path / "metadata.yaml"
    if not metadata_path.exists():
        return {
            "message_count": 0,
            "topic_counts": {},
            "starting_time_sec": None,
            "duration_sec": 0.0,
            "relative_file_paths": [path.name for path in sorted(bag_path.glob("*.db3"))],
        }
    raw = yaml.safe_load(metadata_path.read_text(encoding="utf-8")) or {}
    info = raw.get("rosbag2_bagfile_information", {})
    topic_counts = {
        item.get("topic_metadata", {}).get("name"): item.get("message_count", 0)
        for item in info.get("topics_with_message_count", [])
        if item.get("topic_metadata", {}).get("name")
    }
    start_ns = info.get("starting_time", {}).get("nanoseconds_since_epoch")
    duration_ns = info.get("duration", {}).get("nanoseconds", 0)
    return {
        "message_count": info.get("message_count", sum(topic_counts.values())),
        "topic_counts": topic_counts,
        "starting_time_sec": None if start_ns is None else start_ns * 1e-9,
        "duration_sec": float(duration_ns) * 1e-9,
        "relative_file_paths": info.get("relative_file_paths", [path.name for path in sorted(bag_path.glob("*.db3"))]),
    }


def is_scalar_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def flatten_message_tree(
    node: Any,
    *,
    prefix: str,
    numeric: Dict[str, List[float]],
    strings: Dict[str, str],
) -> None:
    if isinstance(node, (bytes, bytearray, memoryview)):
        return

    if hasattr(node, "get_fields_and_field_types"):
        for field_name in node.get_fields_and_field_types().keys():
            value = getattr(node, field_name)
            next_prefix = f"{prefix}.{field_name}" if prefix else field_name
            flatten_message_tree(value, prefix=next_prefix, numeric=numeric, strings=strings)
        return

    if isinstance(node, dict):
        for key, value in node.items():
            next_prefix = f"{prefix}.{key}" if prefix else key
            flatten_message_tree(value, prefix=next_prefix, numeric=numeric, strings=strings)
        return

    if isinstance(node, list):
        if len(node) > MAX_LIST_FLATTEN:
            return
        for index, value in enumerate(node):
            next_prefix = f"{prefix}[{index}]" if prefix else f"[{index}]"
            flatten_message_tree(value, prefix=next_prefix, numeric=numeric, strings=strings)
        return

    if isinstance(node, bool):
        numeric[prefix].append(float(int(node)))
        return

    if is_scalar_number(node):
        numeric[prefix].append(float(node))
        return

    if isinstance(node, str):
        strings[prefix] = node


def maybe_flatten_json_text(text: str, *, prefix: str, numeric: Dict[str, List[float]]) -> None:
    stripped = text.strip()
    if not stripped or stripped[0] not in "[{":
        return
    try:
        parsed = json.loads(stripped)
    except Exception:
        return

    json_numeric: Dict[str, List[float]] = defaultdict(list)
    json_strings: Dict[str, str] = {}
    flatten_message_tree(parsed, prefix="", numeric=json_numeric, strings=json_strings)
    for field_path, values in json_numeric.items():
        target_path = f"{prefix}.$json.{field_path}" if field_path else f"{prefix}.$json"
        numeric[target_path].extend(values)


def append_numeric_series(topic_entry: Dict[str, Any], field_path: str, t: float, value: float) -> None:
    field = topic_entry["numeric_fields"].setdefault(field_path, {"t": [], "v": []})
    field["t"].append(round(t, 6))
    field["v"].append(float(value))


def append_string_sample(topic_entry: Dict[str, Any], field_path: str, t: float, text: str) -> None:
    field = topic_entry["string_fields"].setdefault(field_path, {"samples": []})
    if len(field["samples"]) >= STREAM_MAX_TEXT_SAMPLES:
        return
    field["samples"].append({"t": round(t, 6), "text": text})


def quaternion_to_yaw_deg(qx: float, qy: float, qz: float, qw: float) -> float:
    siny_cosp = 2.0 * (qw * qz + qx * qy)
    cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz)
    return math.degrees(math.atan2(siny_cosp, cosy_cosp))


def maybe_append_odom_sample(topic_entry: Dict[str, Any], msg: Any, t: float) -> None:
    if type(msg).__module__.startswith("nav_msgs.msg") and type(msg).__name__ == "Odometry":
        pose = msg.pose.pose
        position = pose.position
        orientation = pose.orientation
        yaw_deg = quaternion_to_yaw_deg(
            float(orientation.x),
            float(orientation.y),
            float(orientation.z),
            float(orientation.w),
        )
        topic_entry.setdefault("odom_track", {"samples": []})["samples"].append(
            {
                "t": round(t, 6),
                "x": float(position.x),
                "y": float(position.y),
                "z": float(position.z),
                "yaw_deg": round(yaw_deg, 6),
            }
        )


def sanitize_topic_dirname(topic_name: str) -> str:
    cleaned = []
    for ch in topic_name:
        if ch.isalnum() or ch in {"-", "_", "."}:
            cleaned.append(ch)
        else:
            cleaned.append("_")
    result = "".join(cleaned).strip("._")
    return result or "topic"


def image_extension_for(format_str: Optional[str]) -> str:
    if not format_str:
        return ".jpg"
    token = format_str.lower()
    if "png" in token:
        return ".png"
    if "webp" in token:
        return ".webp"
    return ".jpg"


def write_compressed_image_frame(
    *,
    msg: Any,
    output_dir: Path,
    topic_name: str,
    frame_index: int,
    timeline_sec: float,
) -> Dict[str, Any]:
    fmt = getattr(msg, "format", None)
    ext = image_extension_for(fmt)
    topic_dir = output_dir / "images" / sanitize_topic_dirname(topic_name)
    topic_dir.mkdir(parents=True, exist_ok=True)
    file_path = topic_dir / f"{frame_index:05d}{ext}"
    data = bytes(msg.data)
    file_path.write_bytes(data)
    preview_relpath = None
    width = None
    height = None
    preview_width = None
    preview_height = None
    try:
        image = Image.open(BytesIO(data))
        width, height = image.size
        preview = image.convert("RGB")
        preview.thumbnail((320, 320))
        preview_width, preview_height = preview.size
        preview_dir = output_dir / "previews" / sanitize_topic_dirname(topic_name)
        preview_dir.mkdir(parents=True, exist_ok=True)
        preview_path = preview_dir / f"{frame_index:05d}.jpg"
        preview.save(preview_path, format="JPEG", quality=72, optimize=True)
        preview_relpath = f"previews/{sanitize_topic_dirname(topic_name)}/{preview_path.name}"
    except Exception:
        preview_relpath = None

    return {
        "t": round(timeline_sec, 6),
        "seq": frame_index,
        "file": f"images/{sanitize_topic_dirname(topic_name)}/{file_path.name}",
        "preview_file": preview_relpath,
        "format": fmt or "",
        "bytes": len(data),
        "width": width,
        "height": height,
        "preview_width": preview_width,
        "preview_height": preview_height,
    }


def decode_raw_image_message(msg: Any) -> Image.Image:
    encoding = str(getattr(msg, "encoding", "") or "").lower()
    width = int(getattr(msg, "width", 0))
    height = int(getattr(msg, "height", 0))
    data = bytes(getattr(msg, "data", b""))
    if width <= 0 or height <= 0 or not data:
        raise ValueError("invalid raw image message")

    if encoding in {"rgb8", "8uc3"}:
        return Image.frombytes("RGB", (width, height), data)
    if encoding == "bgr8":
        return Image.frombytes("RGB", (width, height), data, "raw", "BGR")
    if encoding in {"rgba8"}:
        return Image.frombytes("RGBA", (width, height), data)
    if encoding == "bgra8":
        return Image.frombytes("RGBA", (width, height), data, "raw", "BGRA")
    if encoding in {"mono8", "8uc1"}:
        return Image.frombytes("L", (width, height), data)

    raise ValueError(f"unsupported raw image encoding: {encoding}")


def write_raw_image_frame(
    *,
    msg: Any,
    output_dir: Path,
    topic_name: str,
    frame_index: int,
    timeline_sec: float,
) -> Dict[str, Any]:
    topic_dir = output_dir / "images" / sanitize_topic_dirname(topic_name)
    topic_dir.mkdir(parents=True, exist_ok=True)
    file_path = topic_dir / f"{frame_index:05d}.jpg"

    image = decode_raw_image_message(msg).convert("RGB")
    width, height = image.size
    image.save(file_path, format="JPEG", quality=92, optimize=True)

    preview = image.copy()
    preview.thumbnail((320, 320))
    preview_width, preview_height = preview.size
    preview_dir = output_dir / "previews" / sanitize_topic_dirname(topic_name)
    preview_dir.mkdir(parents=True, exist_ok=True)
    preview_path = preview_dir / f"{frame_index:05d}.jpg"
    preview.save(preview_path, format="JPEG", quality=72, optimize=True)

    return {
        "t": round(timeline_sec, 6),
        "seq": frame_index,
        "file": f"images/{sanitize_topic_dirname(topic_name)}/{file_path.name}",
        "preview_file": f"previews/{sanitize_topic_dirname(topic_name)}/{preview_path.name}",
        "format": getattr(msg, "encoding", "") or "",
        "bytes": len(getattr(msg, "data", b"")),
        "width": width,
        "height": height,
        "preview_width": preview_width,
        "preview_height": preview_height,
    }


def finalize_topic_entry(topic_entry: Dict[str, Any]) -> None:
    topic_entry["available_numeric_fields"] = sorted(topic_entry["numeric_fields"].keys())
    topic_entry["available_string_fields"] = sorted(topic_entry["string_fields"].keys())

    for field_path, series in topic_entry["numeric_fields"].items():
        values = series["v"]
        series["count"] = len(values)
        series["min"] = None if not values else round(min(values), 6)
        series["max"] = None if not values else round(max(values), 6)

    for field_path, field in topic_entry["string_fields"].items():
        field["count"] = len(field["samples"])

    if topic_entry.get("image_stream"):
        frames = topic_entry["image_stream"]["frames"]
        topic_entry["image_stream"]["count"] = len(frames)

    if topic_entry.get("odom_track"):
        samples = topic_entry["odom_track"]["samples"]
        topic_entry["odom_track"]["count"] = len(samples)


def iter_sqlite_messages(
    bag_path: Path,
    metadata_summary: Dict[str, Any],
    topic_type_map: Dict[str, str],
):
    db_files = metadata_summary.get("relative_file_paths") or [path.name for path in sorted(bag_path.glob("*.db3"))]
    allowed_topics = {
        name: msg_type
        for name, msg_type in topic_type_map.items()
        if msg_type not in SKIP_TOPIC_TYPES or msg_type in IMAGE_TOPIC_TYPES
    }

    for relative_path in db_files:
        db_path = bag_path / relative_path
        if not db_path.exists():
            continue
        conn = sqlite3.connect(db_path)
        try:
            topic_rows = conn.execute("SELECT id, name, type FROM topics").fetchall()
            id_map = {
                topic_id: (name, msg_type)
                for topic_id, name, msg_type in topic_rows
                if name in allowed_topics
            }
            if not id_map:
                continue
            placeholders = ",".join("?" for _ in id_map)
            query = f"SELECT topic_id, timestamp, data FROM messages WHERE topic_id IN ({placeholders}) ORDER BY timestamp"
            for topic_id, timestamp, raw_data in conn.execute(query, list(id_map.keys())):
                topic_name, topic_type = id_map[topic_id]
                yield topic_name, topic_type, int(timestamp), raw_data
        finally:
            conn.close()


def build_manifest(bag_path: Path, output_dir: Path) -> Dict[str, Any]:
    metadata_summary = load_metadata_summary(bag_path)

    raw_topic_rows = []
    for relative_path in metadata_summary.get("relative_file_paths") or [path.name for path in sorted(bag_path.glob("*.db3"))]:
        db_path = bag_path / relative_path
        if not db_path.exists():
            continue
        conn = sqlite3.connect(db_path)
        try:
            raw_topic_rows = conn.execute("SELECT id, name, type FROM topics").fetchall()
            if raw_topic_rows:
                break
        finally:
            conn.close()

    topic_type_map = {name: msg_type for _, name, msg_type in raw_topic_rows}
    if not topic_type_map:
        raise RuntimeError("No topics found in bag")

    message_class_cache: Dict[str, Any] = {}
    topic_entries: Dict[str, Dict[str, Any]] = {
        topic_name: {
            "name": topic_name,
            "type": topic_type,
            "count": metadata_summary["topic_counts"].get(topic_name, 0),
            "numeric_fields": {},
            "string_fields": {},
            "skipped": topic_type in SKIP_TOPIC_TYPES,
            "skip_reason": "binary_or_image_topic" if topic_type in SKIP_TOPIC_TYPES else None,
            "image_stream": {"frames": []} if topic_type in IMAGE_TOPIC_TYPES else None,
        }
        for topic_name, topic_type in topic_type_map.items()
    }

    total_messages = metadata_summary["message_count"]
    bag_start_sec: Optional[float] = metadata_summary["starting_time_sec"]
    bag_end_sec: Optional[float] = None if bag_start_sec is None else bag_start_sec + metadata_summary["duration_sec"]
    origin_candidates: List[float] = []
    processed_messages = 0
    written_frames = 0

    _update_progress(
        status="parsing",
        processed_messages=0,
        total_messages=total_messages,
        written_frames=0,
        pct=5,
    )

    for topic_name, topic_type, bag_timestamp_ns, raw_data in iter_sqlite_messages(bag_path, metadata_summary, topic_type_map):
        processed_messages += 1
        if processed_messages % 200 == 0:
            print(f"  - 已解析 {processed_messages} 条非二进制消息...", flush=True)
        # 前端按 1.5s 一轮询，这里每 25 条就更新一次即可让进度条顺滑（远高于轮询频率）。
        if processed_messages % 25 == 0:
            # 把扫描阶段映射到 5%~90% 之间，归一化阶段留 90%~99%。
            pct = 5 + int(85 * processed_messages / max(1, total_messages))
            _update_progress(
                processed_messages=processed_messages,
                written_frames=written_frames,
                pct=min(90, pct),
            )
        topic_entry = topic_entries[topic_name]
        bag_timestamp_sec = bag_timestamp_ns * 1e-9

        if topic_type not in message_class_cache:
            try:
                message_class_cache[topic_type] = get_message(topic_type)
            except Exception as exc:
                topic_entry["skipped"] = True
                topic_entry["skip_reason"] = f"get_message_failed: {exc}"
                continue

        try:
            msg = deserialize_message(raw_data, message_class_cache[topic_type])
        except Exception as exc:
            topic_entry["skipped"] = True
            topic_entry["skip_reason"] = f"deserialize_failed: {exc}"
            continue

        header_timestamp_sec = None
        if hasattr(msg, "header") and hasattr(msg.header, "stamp"):
            header_timestamp_sec = ros_stamp_to_sec(msg.header.stamp)
        timeline_sec = header_timestamp_sec if header_timestamp_sec is not None else bag_timestamp_sec
        origin_candidates.append(timeline_sec)

        if topic_type in IMAGE_TOPIC_TYPES:
            frame_index = len(topic_entry["image_stream"]["frames"])
            if topic_type == "sensor_msgs/msg/Image":
                frame_meta = write_raw_image_frame(
                    msg=msg,
                    output_dir=output_dir,
                    topic_name=topic_name,
                    frame_index=frame_index,
                    timeline_sec=timeline_sec,
                )
            else:
                frame_meta = write_compressed_image_frame(
                    msg=msg,
                    output_dir=output_dir,
                    topic_name=topic_name,
                    frame_index=frame_index,
                    timeline_sec=timeline_sec,
                )
            topic_entry["image_stream"]["frames"].append(frame_meta)
            written_frames += 1
            continue

        numeric_fields: Dict[str, List[float]] = defaultdict(list)
        string_fields: Dict[str, str] = {}
        try:
            flatten_message_tree(msg, prefix="", numeric=numeric_fields, strings=string_fields)
        except Exception as exc:
            topic_entry["skipped"] = True
            topic_entry["skip_reason"] = f"flatten_failed: {exc}"
            continue

        for field_path, values in numeric_fields.items():
            if values:
                append_numeric_series(topic_entry, field_path, timeline_sec, values[0])

        for field_path, text_value in string_fields.items():
            append_string_sample(topic_entry, field_path, timeline_sec, text_value)
            maybe_flatten_json_text(text_value, prefix=field_path, numeric=numeric_fields)

        for field_path, values in numeric_fields.items():
            if (".$json." in field_path or field_path.endswith(".$json")) and values:
                append_numeric_series(topic_entry, field_path, timeline_sec, values[0])

        if topic_type in ODOM_TYPE_CANDIDATES or "odom" in topic_name.lower():
            maybe_append_odom_sample(topic_entry, msg, timeline_sec)

    if not origin_candidates:
        raise RuntimeError("No supported messages found in bag")

    print(f"  - 扫描完成，进入归一化阶段，共处理 {processed_messages} 条非二进制消息", flush=True)
    _update_progress(
        processed_messages=processed_messages,
        written_frames=written_frames,
        pct=95,
    )
    timeline_origin_sec = min(origin_candidates)

    for topic_entry in topic_entries.values():
        for series in topic_entry["numeric_fields"].values():
            series["t"] = [round(value - timeline_origin_sec, 6) for value in series["t"]]
        for field in topic_entry["string_fields"].values():
            for sample in field["samples"]:
                sample["t"] = round(sample["t"] - timeline_origin_sec, 6)
        if topic_entry.get("image_stream"):
            for frame in topic_entry["image_stream"]["frames"]:
                frame["t"] = round(frame["t"] - timeline_origin_sec, 6)
        if topic_entry.get("odom_track"):
            for sample in topic_entry["odom_track"]["samples"]:
                sample["t"] = round(sample["t"] - timeline_origin_sec, 6)
        finalize_topic_entry(topic_entry)

    bag_duration_sec = 0.0
    if bag_start_sec is not None and bag_end_sec is not None:
        bag_duration_sec = max(0.0, bag_end_sec - bag_start_sec)

    print(f"  - 归一化完成，准备整理 topic 清单", flush=True)
    sorted_topics = sorted(topic_entries.values(), key=lambda item: item["name"])

    return {
        "schema_version": 2,
        "generated_by": "scripts/export_bag_studio_dataset.py",
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "bag": {
            "name": bag_path.name,
            "path": str(bag_path.resolve()),
            "timeline_origin_iso": to_iso8601(timeline_origin_sec),
            "timeline_origin_note": "优先使用消息 header.stamp，缺失时回退到 rosbag 写入时间。",
            "bag_start_iso": to_iso8601(bag_start_sec),
            "bag_end_iso": to_iso8601(bag_end_sec),
            "duration_sec": round(bag_duration_sec, 6),
            "total_messages": total_messages,
        },
        "topic_order": [topic["name"] for topic in sorted_topics],
        "topics": {topic["name"]: topic for topic in sorted_topics},
    }

def update_index(app_root: Path, dataset_id: str, manifest: Dict[str, Any]) -> None:
    datasets_dir = app_root / "datasets"
    datasets_dir.mkdir(parents=True, exist_ok=True)
    index_path = datasets_dir / "index.json"

    index_data: Dict[str, Any] = {"latest": dataset_id, "datasets": []}
    if index_path.exists():
        try:
            index_data = json.loads(index_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            index_data = {"latest": dataset_id, "datasets": []}

    bag_name = manifest["bag"]["name"]

    # Replace any existing entry for the same bag name (same bag, newer export)
    remaining = [
        item for item in index_data.get("datasets", [])
        if item.get("label") != bag_name
    ]
    entry = {
        "id": dataset_id,
        "label": bag_name,
        "manifest": f"datasets/{dataset_id}/manifest.json",
        "generated_at": manifest["generated_at"],
        "duration_sec": manifest["bag"]["duration_sec"],
        "topic_count": len(manifest["topics"]),
        "total_messages": manifest["bag"]["total_messages"],
    }
    remaining.append(entry)
    remaining.sort(key=lambda item: item.get("generated_at", ""), reverse=True)
    index_data["latest"] = dataset_id
    index_data["datasets"] = remaining
    index_path.write_text(json.dumps(index_data, ensure_ascii=False, indent=2), encoding="utf-8")


def ensure_assets_exist(app_root: Path) -> None:
    # When writing to a data-only directory (e.g. /tmp/live), the web app
    # is served from a separate location; skip asset validation.
    if app_root.name in ("live", "bag_studio_data", "bag_studio_live") or not any(
        (app_root / f).exists() for f in ["index.html", "app.js"]
    ):
        return
    for filename in ["index.html", "app.js", "styles.css", "README.md"]:
        target = app_root / filename
        if not target.exists():
            raise FileNotFoundError(f"Missing app asset: {target}")


def resolve_data_root(app_root: Path, explicit_data_root: Optional[str]) -> Path:
    if explicit_data_root:
        return Path(explicit_data_root).expanduser().resolve()
    if any((app_root / filename).exists() for filename in ["index.html", "app.js", "styles.css"]):
        return DEFAULT_TEMP_DATA_ROOT
    return app_root


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export rosbag into a generic Bag Studio dataset")
    parser.add_argument("bag_path", help="rosbag2 directory path")
    parser.add_argument("--app-root", default="bag_studio", help="Bag Studio app root path")
    parser.add_argument(
        "--data-root",
        default=None,
        help="Parsed dataset output root; default writes runtime data into the system temp directory",
    )
    parser.add_argument("--dataset-id", default=None, help="dataset id under <data-root>/datasets")
    parser.add_argument("--force", action="store_true", help="overwrite existing dataset")
    parser.add_argument(
        "--progress-file",
        default=None,
        help="Path to progress JSON for live status updates (optional)",
    )
    return parser.parse_args()


def main() -> None:
    global _PROGRESS_FILE
    args = parse_args()
    bag_path = Path(args.bag_path).expanduser().resolve()
    if not bag_path.exists():
        raise SystemExit(f"Bag path not found: {bag_path}")

    if args.progress_file:
        _PROGRESS_FILE = Path(args.progress_file).expanduser().resolve()

    app_root = Path(args.app_root).expanduser().resolve()
    ensure_assets_exist(app_root)
    data_root = resolve_data_root(app_root, args.data_root)

    dataset_id = sanitize_dataset_id(args.dataset_id or bag_path.name)
    output_dir = data_root / "datasets" / dataset_id
    ensure_clean_output_dir(output_dir, force=args.force)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/3] 解析 bag: {bag_path}", flush=True)
    rclpy.init(args=None)
    try:
        manifest = build_manifest(bag_path, output_dir)
    finally:
        rclpy.shutdown()

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[2/3] 写入 manifest: {manifest_path}", flush=True)

    update_index(data_root, dataset_id, manifest)
    print(f"[3/3] 更新索引: {data_root / 'datasets' / 'index.json'}", flush=True)

    print("\n完成。")
    print(f"- 数据集 ID: {dataset_id}")
    print(f"- 数据目录: {output_dir}")
    print(f"- topic 数量: {len(manifest['topics'])}")
    print(f"- 消息总数: {manifest['bag']['total_messages']}")
    print(f"- 时长: {manifest['bag']['duration_sec']:.3f}s")
    # 本脚本位于 <repo>/scripts/ 下，父级即 app_root。只有 --app-root 失效时才 fallback 到此。
    server_root = app_root if (app_root / "server.py").exists() else Path(__file__).resolve().parent.parent
    print("\n启动方式：")
    print(f"  cd {server_root}")
    print("  python3 server.py")
    print("  浏览器打开 http://127.0.0.1:18081")


if __name__ == "__main__":
    main()
