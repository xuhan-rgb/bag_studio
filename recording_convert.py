#!/usr/bin/env python3
import shutil
import subprocess
from pathlib import Path


def ensure_ffmpeg() -> str:
    ffmpeg_bin = shutil.which('ffmpeg')
    if not ffmpeg_bin:
        raise RuntimeError('未找到 ffmpeg，请先安装 ffmpeg')
    return ffmpeg_bin


def _has_audio_stream(input_path: Path) -> bool:
    ffprobe_bin = shutil.which('ffprobe')
    if not ffprobe_bin:
        return False
    result = subprocess.run(
        [
            ffprobe_bin,
            '-v',
            'error',
            '-select_streams',
            'a',
            '-show_entries',
            'stream=index',
            '-of',
            'csv=p=0',
            str(input_path),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and bool(result.stdout.strip())


def build_mp4_output_name(input_name: str) -> str:
    base = Path(input_name or 'bag_studio_recording.webm').name
    stem = Path(base).stem or 'bag_studio_recording'
    return f'{stem}.mp4'


def convert_webm_to_mp4(input_path: Path, output_path: Path) -> Path:
    ffmpeg_bin = ensure_ffmpeg()
    input_path = Path(input_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    command = [
        ffmpeg_bin,
        '-y',
        '-i',
        str(input_path),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
    ]
    if _has_audio_stream(input_path):
        command.extend(['-c:a', 'aac'])
    command.append(str(output_path))

    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0 or not output_path.exists():
        error_text = (result.stderr or result.stdout or '').strip()
        tail = error_text.splitlines()[-12:]
        raise RuntimeError('ffmpeg 转 MP4 失败: ' + (' | '.join(tail) if tail else '未知错误'))
    return output_path
