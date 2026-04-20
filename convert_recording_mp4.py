#!/usr/bin/env python3
import argparse
from pathlib import Path

from recording_convert import build_mp4_output_name, convert_webm_to_mp4


def main() -> int:
    parser = argparse.ArgumentParser(description='将 Bag Studio 导出的 WebM 录屏转换为 MP4')
    parser.add_argument('input', help='输入 WebM 文件路径')
    parser.add_argument('-o', '--output', help='输出 MP4 文件路径，默认与输入同目录同名 .mp4')
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    if not input_path.exists():
        raise SystemExit(f'输入文件不存在: {input_path}')

    output_path = Path(args.output).expanduser().resolve() if args.output else input_path.with_name(
        build_mp4_output_name(input_path.name)
    )
    convert_webm_to_mp4(input_path, output_path)
    print(output_path)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
