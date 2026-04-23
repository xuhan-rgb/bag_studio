#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any

_FINGERPRINT_FILE_SUFFIXES = {'.db3', '.mcap'}
_FINGERPRINT_FILE_NAMES = {'metadata.yaml'}


def sanitize_dataset_id(value: str) -> str:
    cleaned = []
    for ch in value:
        if ch.isalnum() or ch in {'-', '_', '.'}:
            cleaned.append(ch)
        else:
            cleaned.append('_')
    result = ''.join(cleaned).strip('._')
    return result or 'bag_studio_dataset'


def compute_dataset_id(bag_path: Path) -> str:
    bag_path = Path(bag_path).expanduser().resolve()
    name = sanitize_dataset_id(bag_path.name)
    path_hash = hashlib.sha1(str(bag_path).encode('utf-8', errors='ignore')).hexdigest()[:10]
    return f'{name}_{path_hash}'


def read_json_file(path: Path) -> Any | None:
    try:
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


def atomic_write_text(path: Path, text: str, *, encoding: str = 'utf-8') -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=f'.{path.name}.', suffix='.tmp', dir=str(path.parent))
    try:
        with os.fdopen(fd, 'w', encoding=encoding) as fp:
            fp.write(text)
        os.replace(tmp_path, path)
    finally:
        try:
            os.unlink(tmp_path)
        except FileNotFoundError:
            pass


def atomic_write_json(
    path: Path,
    data: Any,
    *,
    ensure_ascii: bool = False,
    indent: int | None = None,
) -> None:
    atomic_write_text(
        path,
        json.dumps(data, ensure_ascii=ensure_ascii, indent=indent),
        encoding='utf-8',
    )


def compute_bag_fingerprint(bag_path: Path) -> str:
    bag_path = Path(bag_path).expanduser().resolve()
    hasher = hashlib.sha256()

    try:
        selected_files = [
            entry
            for entry in sorted(bag_path.iterdir(), key=lambda item: item.name)
            if entry.is_file()
            and (
                entry.name in _FINGERPRINT_FILE_NAMES
                or entry.suffix.lower() in _FINGERPRINT_FILE_SUFFIXES
            )
        ]
    except Exception:
        selected_files = []

    if not selected_files:
        hasher.update(str(bag_path).encode('utf-8', errors='ignore'))
        return hasher.hexdigest()[:16]

    used_entries = 0
    for entry in selected_files:
        try:
            stat = entry.stat()
        except OSError:
            continue
        used_entries += 1
        hasher.update(entry.name.encode('utf-8', errors='ignore'))
        hasher.update(str(stat.st_size).encode('ascii'))
        hasher.update(str(stat.st_mtime_ns).encode('ascii'))

    if used_entries == 0:
        hasher.update(str(bag_path).encode('utf-8', errors='ignore'))

    return hasher.hexdigest()[:16]


def build_dataset_index_entry(dataset_id: str, manifest: dict[str, Any]) -> dict[str, Any]:
    bag = manifest.get('bag') or {}
    topics = manifest.get('topics') or {}
    return {
        'id': dataset_id,
        'label': bag.get('name') or dataset_id,
        'manifest': f'datasets/{dataset_id}/manifest.json',
        'generated_at': manifest.get('generated_at', ''),
        'duration_sec': bag.get('duration_sec', 0),
        'topic_count': len(topics),
        'total_messages': bag.get('total_messages', 0),
        'source_bag_path': bag.get('path'),
    }


def merge_dataset_index(
    index_data: Any,
    *,
    dataset_id: str,
    manifest: dict[str, Any],
) -> dict[str, Any]:
    existing_items = []
    if isinstance(index_data, dict) and isinstance(index_data.get('datasets'), list):
        existing_items = [item for item in index_data['datasets'] if isinstance(item, dict)]

    entry = build_dataset_index_entry(dataset_id, manifest)
    source_bag_path = entry.get('source_bag_path')
    remaining = []
    for item in existing_items:
        if item.get('id') == dataset_id:
            continue
        if source_bag_path and item.get('source_bag_path') == source_bag_path:
            continue
        remaining.append(item)

    remaining.append(entry)
    remaining.sort(key=lambda item: item.get('generated_at', ''), reverse=True)
    return {
        'latest': dataset_id,
        'datasets': remaining,
    }
