#!/usr/bin/env python3
"""
Bag Studio HTTP Server (Flask-based)
- Serves bag_studio UI at /
- POST /parse_bag -> runs export script inside distrobox container
- Serves parsed bag data from the system temp directory
"""
import json
import os
import shlex
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

from flask import Flask, after_this_request, jsonify, request, send_file, send_from_directory

import runner
from recording_convert import build_mp4_output_name, convert_webm_to_mp4

APP_ROOT = Path(__file__).parent
LIVE_DIR = Path(tempfile.gettempdir()) / 'bag_studio_live'
DATASETS_DIR = LIVE_DIR / 'datasets'
LEGACY_DATASETS_DIR = APP_ROOT / 'datasets'
EXPORT_SCRIPT = APP_ROOT / 'scripts' / 'export_bag_studio_dataset.py'
LIVE_DIR.mkdir(parents=True, exist_ok=True)
DATASETS_DIR.mkdir(parents=True, exist_ok=True)
PROGRESS_FILE = LIVE_DIR / '_progress.json'

app = Flask(__name__, static_folder=str(APP_ROOT), static_url_path='')


def migrate_legacy_datasets() -> None:
    if not LEGACY_DATASETS_DIR.exists():
        return
    migrated = 0
    for entry in LEGACY_DATASETS_DIR.iterdir():
        if not entry.is_dir():
            continue
        target = DATASETS_DIR / entry.name
        if target.exists():
            continue
        shutil.move(str(entry), str(target))
        migrated += 1
    legacy_index = LEGACY_DATASETS_DIR / 'index.json'
    runtime_index = DATASETS_DIR / 'index.json'
    if legacy_index.exists() and not runtime_index.exists():
        shutil.copy2(legacy_index, runtime_index)
    if migrated:
        print(f'Bag Studio migrated {migrated} dataset(s) into temp storage: {DATASETS_DIR}')


migrate_legacy_datasets()


def read_progress():
    if PROGRESS_FILE.exists():
        try:
            return json.loads(PROGRESS_FILE.read_text(encoding='utf-8'))
        except Exception:
            return None
    return None


def write_progress(data):
    PROGRESS_FILE.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')


def pick_directory_via_dialog() -> str:
    dialog_commands = [
        ['zenity', '--file-selection', '--directory', '--title=选择 rosbag2 目录'],
        ['qarma', '--file-selection', '--directory', '--title=选择 rosbag2 目录'],
        ['yad', '--file-selection', '--directory', '--title=选择 rosbag2 目录'],
        ['kdialog', '--getexistingdirectory', str(Path.home()), '--title', '选择 rosbag2 目录'],
    ]
    for command in dialog_commands:
        executable = shutil.which(command[0])
        if not executable:
            continue
        try:
            result = subprocess.run([executable, *command[1:]], check=False, capture_output=True, text=True)
        except Exception:
            continue
        if result.returncode == 0:
            selected = result.stdout.strip()
            if selected:
                return selected
        if result.returncode in (1, 130):
            raise RuntimeError('已取消目录选择')

    python_exec = shutil.which('python3') or shutil.which('python')
    if python_exec:
        script = (
            'import tkinter as tk\n'
            'from tkinter import filedialog\n'
            'root = tk.Tk()\n'
            'root.withdraw()\n'
            'root.attributes("-topmost", True)\n'
            'path = filedialog.askdirectory(title="选择 rosbag2 目录")\n'
            'print(path)\n'
        )
        result = subprocess.run([python_exec, '-c', script], check=False, capture_output=True, text=True)
        if result.returncode == 0:
            selected = result.stdout.strip()
            if selected:
                return selected
            raise RuntimeError('已取消目录选择')

    raise RuntimeError('未找到可用的目录选择器，请安装 zenity / kdialog，或手动输入路径')


def run_export_in_container(bag_path: str):
    import hashlib

    bag_p = Path(bag_path).expanduser().resolve()
    if not bag_p.exists():
        write_progress({'status': 'error', 'error': f'Bag not found: {bag_path}'})
        return

    try:
        db_files = sorted(bag_p.glob('*.db3'))
        if db_files:
            st = db_files[0].stat()
            fp = hashlib.sha256(f'{db_files[0]}{st.st_mtime}{st.st_size}'.encode()).hexdigest()[:16]
        else:
            fp = hashlib.sha256(str(bag_p).encode()).hexdigest()[:16]
    except Exception:
        fp = hashlib.sha256(str(bag_p).encode()).hexdigest()[:16]

    write_progress({
        'status': 'parsing',
        'bag_path': str(bag_path),
        'fingerprint': fp,
        'already_cached': False,
        'processed_messages': 0,
        'total_messages': 0,
        'written_frames': 0,
        'pct': 0,
    })

    dataset_id = bag_p.name
    output_dir = DATASETS_DIR / dataset_id
    cached_marker = output_dir / '.fingerprint'
    manifest_relpath = f'/datasets/{dataset_id}/manifest.json'

    if cached_marker.exists() and cached_marker.read_text(encoding='utf-8') == fp and (output_dir / 'manifest.json').exists():
        write_progress({'status': 'done', 'already_cached': True, 'dataset_id': dataset_id, 'manifest': manifest_relpath})
        return

    try:
        runner_cfg = runner.load_config()
    except RuntimeError as exc:
        write_progress({'status': 'error', 'error': f'runner 配置错误: {exc}'})
        return

    ok, message = runner.probe_ros2_humble(runner_cfg)
    if not ok:
        write_progress({'status': 'error', 'error': message})
        return

    log_path = Path(f'/tmp/export_{dataset_id}.log')
    export_args = (
        ' ' + shlex.quote(str(bag_p)) +
        ' --app-root ' + shlex.quote(str(APP_ROOT)) +
        ' --dataset-id ' + shlex.quote(dataset_id) +
        ' --progress-file ' + shlex.quote(str(PROGRESS_FILE)) +
        ' --force'
    )
    # 切到 app_root 为 CWD，让 export 脚本里任何潜在相对路径都以工程根为基准（目前其实全用绝对路径，此处仅为防御）。
    shell_cmd = ' && '.join([
        'cd ' + shlex.quote(str(APP_ROOT)),
        'python3 ' + shlex.quote(str(EXPORT_SCRIPT)) + export_args,
    ])
    cmd = runner.wrap_command(runner_cfg, shell_cmd)
    env = os.environ.copy()
    env['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/bin:/bin'

    try:
        with log_path.open('w', encoding='utf-8') as log_fp:
            proc = subprocess.Popen(cmd, env=env, stdout=log_fp, stderr=subprocess.STDOUT, start_new_session=True, text=True)
            exit_code = proc.wait()
    except Exception as exc:
        write_progress({'status': 'error', 'error': str(exc)})
        return

    manifest_path = output_dir / 'manifest.json'
    if exit_code == 0 and manifest_path.exists():
        output_dir.mkdir(parents=True, exist_ok=True)
        cached_marker.write_text(fp, encoding='utf-8')
        write_progress({'status': 'done', 'already_cached': False, 'dataset_id': dataset_id, 'manifest': manifest_relpath})
        return

    try:
        log_tail = log_path.read_text(encoding='utf-8', errors='replace')[-1000:]
    except Exception:
        log_tail = ''
    write_progress({'status': 'error', 'error': f'Export failed (exit {exit_code}): {log_tail or "查看 /tmp 导出日志失败"}'})


@app.route('/')
def index():
    return send_from_directory(APP_ROOT, 'index.html')


@app.route('/datasets/<path:filename>')
def datasets(filename):
    return send_from_directory(DATASETS_DIR, filename)


@app.route('/parse_bag', methods=['POST'])
def parse_bag():
    data = request.get_json(force=True) or {}
    bag_path = data.get('bag_path', '').strip()
    if not bag_path:
        return jsonify({'error': 'bag_path is required'}), 400

    progress = read_progress()
    if progress and progress.get('status') == 'parsing':
        return jsonify({'status': 'already_parsing', 'bag_path': progress.get('bag_path')}), 409

    write_progress({'status': 'starting', 'bag_path': bag_path})
    thread = threading.Thread(target=run_export_in_container, args=(bag_path,), daemon=True)
    thread.start()
    return jsonify({'status': 'started', 'bag_path': bag_path})


@app.route('/pick_bag_dir', methods=['POST'])
def pick_bag_dir():
    try:
        selected = pick_directory_via_dialog()
    except RuntimeError as exc:
        message = str(exc)
        status_code = 499 if '取消' in message else 500
        return jsonify({'error': message}), status_code
    except Exception as exc:
        return jsonify({'error': f'目录选择失败: {exc}'}), 500
    return jsonify({'path': selected})


@app.route('/progress.json')
def progress():
    progress_data = read_progress()
    if progress_data is None:
        return jsonify({'status': 'idle'})
    return jsonify(progress_data)


@app.route('/datasets/')
def datasets_index():
    index_path = DATASETS_DIR / 'index.json'
    if index_path.exists():
        return send_from_directory(DATASETS_DIR, 'index.json')
    return jsonify({'latest': None, 'datasets': []})


@app.route('/api/recordings/convert_mp4', methods=['POST'])
def convert_recording_mp4():
    file_storage = request.files.get('recording')
    if not file_storage or not file_storage.filename:
        return jsonify({'error': 'recording file is required'}), 400

    temp_dir = Path(tempfile.mkdtemp(prefix='bag_studio_recording_', dir=str(LIVE_DIR)))
    input_name = Path(file_storage.filename).name or 'bag_studio_recording.webm'
    input_path = temp_dir / input_name
    output_path = temp_dir / build_mp4_output_name(input_name)

    try:
        file_storage.save(input_path)
        convert_webm_to_mp4(input_path, output_path)
    except Exception as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return jsonify({'error': str(exc)}), 500

    @after_this_request
    def cleanup_temp_dir(response):
        shutil.rmtree(temp_dir, ignore_errors=True)
        return response

    return send_file(
        output_path,
        mimetype='video/mp4',
        as_attachment=True,
        download_name=output_path.name,
        max_age=0,
    )


def _probe_runner_or_exit() -> None:
    import sys

    try:
        cfg = runner.load_config()
    except RuntimeError as exc:
        print(f'[runner] 配置错误: {exc}', file=sys.stderr)
        sys.exit(10)
    print(f'[runner] mode = {cfg.describe()}')
    ok, message = runner.probe_ros2_humble(cfg)
    if not ok:
        print(f'[runner] ✗ {message}', file=sys.stderr)
        print('[runner] 启动终止。请先在当前 shell 准备好 ROS2 Humble 再启动 server。', file=sys.stderr)
        sys.exit(1)
    print(f'[runner] ✓ {message}')


if __name__ == '__main__':
    _probe_runner_or_exit()
    print('Bag Studio server starting at http://127.0.0.1:18081')
    app.run(host='127.0.0.1', port=18081, debug=False, threaded=True)
