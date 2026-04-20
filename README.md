# Bag Studio

一个本地离线的 **Foxglove-lite 原型**，用于查看 ROS2 rosbag：

- 任意 ROS 数值字段作图
- 图像浏览器 + 时间轴联动
- XY 子图工作区
- 指定 `odom -> global` 变换后绘制轨迹
- 局部 `XY / 距离+方位角` 转全局

## 目录结构

```
bag_studio/
├── index.html, app.js, styles.css   # 前端（纯静态资源）
├── server.py                         # Flask 后端 + 导出任务编排
├── runner.py                         # 运行环境抽象（host / distrobox / docker）
├── scripts/
│   └── export_bag_studio_dataset.py  # rosbag → 数据集导出脚本（需 ROS2 Humble）
├── recording_convert.py, convert_recording_mp4.py  # 前端录屏 WebM → MP4 转换
├── start.sh, stop.sh                 # 后台启/停脚本
└── requirements.txt                  # Python 依赖（不含 ROS2，由用户 source 提供）
```

仓库自包含 —— clone 下来即可跑；不再依赖任何工程外路径。

## 前置条件

1. **Python 3.10+**（ROS2 Humble 绑定的版本，一般即系统 Python）
2. **ROS2 Humble**，安装路径默认在 `/opt/ros/humble/setup.bash`（Ubuntu 22.04 官方包）
3. **Python 依赖**（除 ROS2 自带的 `rclpy` 外）：
   ```bash
   pip install -r requirements.txt
   ```
4. （可选）`ffmpeg` —— 用于前端录屏导出为 MP4

## 启动

### 核心约定

**你在哪个 shell 里执行 `bash start.sh`，那就是 Bag Studio 的运行环境。**
`server.py` 不会自动 `source` ROS2 —— source 是你的事，run 在哪个 env 里也是你的事。

启动时会探测一次；**检测不到 ROS2 Humble 就直接拒绝启动**（`start.sh` 和 `server.py` 都是 fail-fast）。

### 典型用法

```bash
# A. 宿主机直接跑
source /opt/ros/humble/setup.bash
bash start.sh

# B. 在 distrobox 容器里跑
distrobox enter <your_container>
source /opt/ros/humble/setup.bash     # 或已写进容器内 ~/.bashrc
bash start.sh

# C. 在 docker 容器里跑
docker run --rm -it -v <your_workspace>:<your_workspace> -p 18081:18081 <ros2_image> bash
source /opt/ros/humble/setup.bash
bash start.sh
```

三种情况下 `runner mode` 都用默认的 `host` —— server 直接继承当前 shell 环境，不往别的容器里跳。

### 独立验证 ROS2 是否就绪（不启动 server）

```bash
python3 runner.py    # 返回 0=OK；非 0=未就绪（stderr 含原因）
```

### 访问

```
http://127.0.0.1:18081
```

## 高级：Runner 配置（少见）

只有当你想 **"server 在 A 环境、export 跳到 B 容器"** 时才用。例如 server 跑在宿主机，但 bag 解析想走 distrobox：

```bash
cp runner_config.json.example runner_config.json
# 编辑 mode / distrobox_name / docker_image / docker_mounts

# 或用环境变量临时覆盖
BAG_STUDIO_RUNNER=distrobox BAG_STUDIO_DISTROBOX_NAME=<your_container> bash start.sh
BAG_STUDIO_RUNNER=docker    BAG_STUDIO_DOCKER_IMAGE=<your_image>      bash start.sh
```

优先级：**环境变量 > `runner_config.json` > 内置默认（`host`）**。

## 运行时数据

- 解析后的数据集默认写到系统临时目录：`$XDG_RUNTIME_DIR/bag_studio_live/datasets/` 或 `/tmp/bag_studio_live/datasets/`
- 前端界面配置（作图布局、颜色主题等）存在浏览器 `localStorage`，与后端无关
- 可通过 `export_bag_studio_dataset.py --data-root <dir>` 改写位置

## 直接调用 export 脚本（跳过 Web UI）

```bash
source /opt/ros/humble/setup.bash
python3 scripts/export_bag_studio_dataset.py /path/to/rosbag2_directory --force
```

参数：

- `bag_path` (位置参数)：rosbag2 目录
- `--app-root`：默认为 `bag_studio`，通常是本目录
- `--data-root`：数据集输出根目录，默认系统临时目录
- `--dataset-id`：数据集名，默认取 bag 目录名
- `--force`：覆盖同名数据集
- `--progress-file`：进度 JSON 写入位置（Web UI 使用；命令行一般不需要）
