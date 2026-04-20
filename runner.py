#!/usr/bin/env python3
"""Runner abstraction for Bag Studio export commands.

Supports three modes:
  - host      : run in the same shell/env as server.py (user must source ROS2 Humble before launching)
  - distrobox : enter a named distrobox container (user must source ROS2 in its login shell / .bashrc)
  - docker    : `docker run` a ROS-capable image (user must bake ROS2 Humble into the image)

This module never auto-sources `/opt/ros/humble/setup.bash`. Sourcing is the user's
responsibility. We only *probe* the target environment — if ROS2 Humble is not
detected, callers must fail fast with a clear error.
"""
from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

APP_ROOT = Path(__file__).parent
CONFIG_PATH = APP_ROOT / 'runner_config.json'
SUPPORTED_MODES = ('host', 'distrobox', 'docker')


@dataclass
class RunnerConfig:
    # 默认 host：直接继承启动 server.py 的 shell 环境。
    # 用户在哪个 shell 里（宿主机 / distrobox enter / docker exec）启动 start.sh，
    # 那个 shell 就是运行环境；由用户自己负责 source ROS2 Humble。
    mode: str = 'host'
    # distrobox / docker 模式必须由用户在 runner_config.json 或环境变量里显式提供。
    distrobox_name: str = ''
    docker_image: str = ''
    docker_mounts: list = field(default_factory=list)
    docker_extra_args: list = field(default_factory=list)

    def describe(self) -> str:
        if self.mode == 'host':
            return 'host (当前 shell)'
        if self.mode == 'distrobox':
            return f'distrobox://{self.distrobox_name}'
        if self.mode == 'docker':
            return f'docker://{self.docker_image}'
        return self.mode


def load_config() -> RunnerConfig:
    cfg = RunnerConfig()

    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text(encoding='utf-8'))
        except Exception as exc:
            raise RuntimeError(f'runner_config.json 解析失败: {exc}') from exc
        for key in ('mode', 'distrobox_name', 'docker_image'):
            if key in data and isinstance(data[key], str):
                setattr(cfg, key, data[key])
        if isinstance(data.get('docker_mounts'), list):
            cfg.docker_mounts = [str(x) for x in data['docker_mounts']]
        if isinstance(data.get('docker_extra_args'), list):
            cfg.docker_extra_args = [str(x) for x in data['docker_extra_args']]

    env_mode = os.environ.get('BAG_STUDIO_RUNNER', '').strip().lower()
    if env_mode:
        cfg.mode = env_mode
    if v := os.environ.get('BAG_STUDIO_DISTROBOX_NAME'):
        cfg.distrobox_name = v.strip()
    if v := os.environ.get('BAG_STUDIO_DOCKER_IMAGE'):
        cfg.docker_image = v.strip()

    if cfg.mode not in SUPPORTED_MODES:
        raise RuntimeError(
            f'不支持的 runner mode: {cfg.mode!r} (合法值: {", ".join(SUPPORTED_MODES)})'
        )
    if cfg.mode == 'distrobox' and not cfg.distrobox_name:
        raise RuntimeError(
            'mode=distrobox 需要指定容器名：'
            '在 runner_config.json 里设置 "distrobox_name"，或用 BAG_STUDIO_DISTROBOX_NAME 环境变量'
        )
    if cfg.mode == 'docker' and not cfg.docker_image:
        raise RuntimeError(
            'mode=docker 需要指定镜像：'
            '在 runner_config.json 里设置 "docker_image"，或用 BAG_STUDIO_DOCKER_IMAGE 环境变量'
        )
    return cfg


def wrap_command(cfg: RunnerConfig, shell_cmd: str) -> list[str]:
    """Return subprocess argv that runs `shell_cmd` inside the configured environment."""
    if cfg.mode == 'host':
        # host 模式：直接用 `bash -c`，不走 login shell —— 因为调用方（start.sh 所在 shell）
        # 已经 source 好 ROS2，子进程通过 env 继承即可。避开 -l 可能重跑 profile 脚本的副作用。
        return ['bash', '-c', shell_cmd]
    if cfg.mode == 'distrobox':
        return ['distrobox', 'enter', cfg.distrobox_name, '--', 'bash', '-lc', shell_cmd]
    if cfg.mode == 'docker':
        argv = ['docker', 'run', '--rm', '-i']
        for mount in cfg.docker_mounts:
            argv.extend(['-v', mount])
        argv.extend(cfg.docker_extra_args)
        argv.append(cfg.docker_image)
        argv.extend(['bash', '-lc', shell_cmd])
        return argv
    raise RuntimeError(f'未知的 runner mode: {cfg.mode}')


# 探测逻辑：同时检查 $ROS_DISTRO == humble 且 rclpy 可导入。
# 只看环境变量会被误设置蒙骗；只试 import rclpy 又无法区分 humble / foxy 等版本。
_PROBE_SHELL = (
    'set -e; '
    '[ "${ROS_DISTRO:-}" = "humble" ] || { echo "ROS_DISTRO=${ROS_DISTRO:-<unset>}" >&2; exit 2; }; '
    'python3 -c "import rclpy" || { echo "rclpy import failed" >&2; exit 3; }; '
    'echo OK'
)


def probe_ros2_humble(cfg: RunnerConfig, timeout: float = 20.0) -> tuple[bool, str]:
    """Check ROS2 Humble availability in the runner's target environment.

    Returns (ok, message). `message` is human-readable and safe to surface to the UI.
    """
    argv = wrap_command(cfg, _PROBE_SHELL)
    try:
        result = subprocess.run(argv, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError as exc:
        return False, f'runner 启动失败（{cfg.describe()}）: {exc}'
    except subprocess.TimeoutExpired:
        return False, f'ROS2 探测超时 ({timeout}s)，请检查 {cfg.describe()} 是否可用'

    if result.returncode == 0 and 'OK' in (result.stdout or ''):
        return True, f'ROS2 Humble OK ({cfg.describe()})'

    stderr_tail = (result.stderr or result.stdout or '').strip().splitlines()[-3:]
    detail = ' | '.join(stderr_tail) if stderr_tail else f'exit={result.returncode}'
    hint = {
        'host': (
            '请在**启动 start.sh 之前**于当前 shell 里执行 '
            '`source /opt/ros/humble/setup.bash`，然后再跑 `bash start.sh`'
        ),
        'distrobox': (
            f'请在 distrobox 容器 `{cfg.distrobox_name}` 的登录 shell 里 source ROS2 Humble'
            '（推荐写进容器内的 ~/.bashrc）'
        ),
        'docker': f'请确认镜像 `{cfg.docker_image}` 已内置 ROS2 Humble，并在登录 shell 里自动 source',
    }.get(cfg.mode, '')
    return False, f'未检测到 ROS2 Humble [{cfg.describe()}]: {detail}。{hint}'


if __name__ == '__main__':
    # 独立探测：在目标 shell 里 `python3 runner.py` 即可验证 ROS2 是否就绪，
    # 通过返回码告诉 shell 是否 OK（0=OK, 非 0=失败），方便写脚本联动。
    import sys

    try:
        _cfg = load_config()
    except RuntimeError as _exc:
        print(f'[runner] 配置错误: {_exc}', file=sys.stderr)
        sys.exit(10)

    print(f'[runner] mode = {_cfg.describe()}')
    _ok, _msg = probe_ros2_humble(_cfg)
    if _ok:
        print(f'[runner] ✓ {_msg}')
        sys.exit(0)
    print(f'[runner] ✗ {_msg}', file=sys.stderr)
    sys.exit(1)
