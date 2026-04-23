# Detection2D 叠加到相机图像 — 设计文档

**日期**：2026-04-23
**作者**：协作设计（user + Claude）
**状态**：已批准，待实现

## 目标

在 Bag Studio 的图像浏览器里，把 `vision_msgs/msg/Detection2DArray` 消息里的 2D 检测框，按 `header.frame_id` 匹配到对应相机（例如 `front` / `rear`），实时叠加在相机图像上。

## 非目标

- 不做检测结果的统计 / 过滤 UI（未来需求，YAGNI）
- 不做多目标跟踪可视化（tracking_id 轨迹连线）
- 不改动原始导出的 JPG 文件
- 不支持 Detection3D（本次只做 2D）

## 方案总览

**方案 B —— 导出结构化 JSON，前端实时叠加。**

- 导出阶段为 Detection2DArray 写专用提取器，绕过 `MAX_LIST_FLATTEN=16` 的限制
- 前端在相机瓦片上叠一层 `<canvas>`，按时间游标做最近邻匹配后绘制

备选方案（均已否决）：
- 方案 A（导出时烧进 JPG）：破坏性 + 不可交互
- 方案 C（两者都做）：YAGNI

## 架构

```
┌─────────────────────────────────────────────────────┐
│ 导出阶段 (scripts/export_bag_studio_dataset.py)      │
│   - 新增 Detection2DArray 专用提取器                 │
│   - 输出到 manifest.json 的 topic_entry：            │
│     detection2d_stream = {                          │
│       frame_ids: ["front", "rear"],                │
│       samples: [                                    │
│         {t, frame_id, boxes: [                     │
│           {cx, cy, sx, sy, theta, id, score}       │
│         ]}                                          │
│       ]                                             │
│     }                                               │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 前端 (app.js)                                        │
│   1. 读取 manifest，建立 detection 索引              │
│   2. 渲染相机瓦片时：                                │
│      - 从 topic 名提取关键词（front / rear / ...）   │
│      - 在 Detection2DArray topic 里找 frame_id 命中 │
│      - 按 cursor.t 做最近邻匹配 (容差 100ms)         │
│      - 在 <img> 上叠 <canvas> 画框                  │
│   3. 瓦片头新增 [☑ 框] checkbox                     │
└─────────────────────────────────────────────────────┘
```

## 数据契约

### manifest.json 新字段

对 `topic_type == "vision_msgs/msg/Detection2DArray"` 的 topic，`topic_entry` 新增：

```json
{
  "detection2d_stream": {
    "count": 233,
    "frame_ids": ["front", "rear"],
    "samples": [
      {
        "t": 0.123456,
        "frame_id": "front",
        "boxes": [
          {
            "cx": 412.5,
            "cy": 287.0,
            "sx": 120.0,
            "sy": 230.0,
            "theta": 0.0,
            "id": "person",
            "score": 0.87
          }
        ]
      }
    ]
  }
}
```

**字段说明**：
- `t`：相对 `timeline_origin` 的秒数（与 image_stream.frames[].t 同一基准）
- `frame_id`：来自 `msg.header.frame_id`，原样保留
- `cx, cy`：像素中心坐标
- `sx, sy`：像素宽高
- `theta`：弧度，0 表示轴对齐（多数场景）
- `id`：`results[0].id`（类名字符串），空字符串表示未提供
- `score`：`results[0].score`（置信度 0~1），缺失时为 null
- 只取 `results[0]`（多假设场景罕见，YAGNI）
- `frame_ids`：该 topic 下出现过的所有不重复 frame_id 列表，用于前端调试/兜底

### 时间同步

- 每条 Detection2DArray 的 `t` 优先用 `msg.header.stamp`，fallback 到 bag 写入时间戳，与现有图像帧处理一致
- 前端匹配规则：最近邻 + 100ms 硬容差，超出容差不画框

## 模块划分

### 1. 导出模块：`scripts/export_bag_studio_dataset.py`

**新增常量**：
```python
DETECTION2D_TYPE = "vision_msgs/msg/Detection2DArray"
```

**新增函数**：
```python
def extract_detection2d_array(msg: Any) -> Dict[str, Any]:
    """把 Detection2DArray 消息抽成 {frame_id, boxes[]} 字典。"""
```

**修改点**：
- `build_manifest` 主循环：若 `topic_type == DETECTION2D_TYPE`，走专用路径，调用 `extract_detection2d_array` 并追加到 `topic_entry["detection2d_stream"]["samples"]`
- `topic_entries` 初始化时为该类型预置 `detection2d_stream` 空结构
- `finalize_topic_entry`：计算 `count` 与 `frame_ids` 唯一集合，并把 samples 的 `t` 减去 `timeline_origin_sec`
- 保留 `flatten_message_tree` 的调用（会产生 header.stamp 等标量，不影响现有功能）；但对 `results[]` 数组的无意义扁平化不再需要特别处理，`MAX_LIST_FLATTEN=16` 会让它自然被忽略

### 2. 前端数据层：`app.js`

**新增辅助函数**：
```js
function getDetection2DTopics() { /* 列出所有含 detection2d_stream 的 topic */ }

function extractCameraKeyword(imageTopicName) {
  // "/front_camera/image_compressed" -> "front"
  // "/rear_camera/image_compressed"  -> "rear"
  // 【用户实现 5-10 行】
}

function findMatchingDetectionStream(imageTopicName) {
  // 返回 {topic, samples} 或 null
  // 【用户实现】使用 extractCameraKeyword 后在所有 Detection2DArray topic 里
  // 找 sample.frame_id 包含该关键词的流
}

function findNearestDetectionSample(samples, t, tolSec = 0.1) {
  // 二分查找最近邻；超容差返回 null
}
```

### 3. 前端渲染层：`app.js` + `styles.css` + `index.html`

**DOM 结构变更**（`buildImageTileHtml`）：
```html
<div class="cam-tile-stage">
  <img class="cam-frame-img" ...>
  <canvas class="cam-bbox-canvas"></canvas>  <!-- 新增 -->
  ...
</div>
<div class="cam-tile-head">
  <select class="cam-topic-select">...</select>
  <label class="cam-bbox-toggle-label">
    <input type="checkbox" class="cam-bbox-toggle" checked> 框
  </label>
  ...
</div>
```

**CSS 新增**：
```css
.cam-bbox-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}
.cam-bbox-toggle-label { font-size: 12px; color: #bbb; }
```

**核心绘制函数**：
```js
function drawBBoxes(canvas, img, sample) {
  // 【用户实现 5-10 行】
  // 1. canvas.width/height 设为 img 实际显示尺寸
  // 2. 计算 img 原生尺寸到显示尺寸的缩放比例
  // 3. 遍历 sample.boxes，按 cx/cy/sx/sy/theta 绘制矩形（亮绿 #00ff88, 2px）
  // 4. 绘制标签 "id score" 于左上角
}
```

**集成到 `updateImageTile`**：
- 找到 canvas 元素
- 若对应 panel 的 `bboxEnabled[panelIdx]` 为 false → 清空 canvas 返回
- 否则调用 `findMatchingDetectionStream` → `findNearestDetectionSample` → `drawBBoxes`
- 图片 `load` 事件后也要重画一次（保证拿到正确的 naturalWidth/naturalHeight）
- 窗口 resize 时也要重画

**事件绑定**（`bindImageGridEvents`）：
- 监听 `.cam-bbox-toggle` 的 change 事件，更新 `state.imageViewer.bboxEnabled[idx]` 并重画该瓦片

### 4. 状态管理

`state.imageViewer` 增加：
```js
bboxEnabled: []  // 按 panelIdx 索引，默认 true；长度与 panels 同步
```

## 测试计划

### 后端单元测试（`tests/test_detection2d_export.py`）

用 mock 对象模拟 Detection2DArray 消息，验证 `extract_detection2d_array` 输出：
- 空 results：`id=""`, `score=null`
- 有 results：取 `results[0]`
- theta 非零：原样传递
- frame_id 空字符串：原样传递

不依赖 rclpy，用纯 dict/SimpleNamespace 构造 mock。

### 手动验证

在用户提供的 bag（`rosbag2_2026_04_23-22_30_36`）上：
1. 跑导出脚本，检查 manifest 里 `/perception/detection2d` 的 `detection2d_stream.samples` 有 233 条，`frame_ids` 含 `front` 和 `rear`
2. 启动 server.py，打开浏览器
3. 同时打开 `/front_camera` + `/rear_camera` 两个瓦片
4. 验证：
   - 拖动时间轴时框跟随变化
   - `front_camera` 瓦片只显示 `frame_id=front` 的框
   - `rear_camera` 瓦片只显示 `frame_id=rear` 的框
   - 关闭 checkbox 后框消失，打开后重新出现
   - 框位置视觉上与图像中物体对齐
   - 标签显示 `id score`

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| `bbox.center.theta` 在本 bag 全为 0，旋转代码无测试覆盖 | mock 测试里显式传入非零 theta；绘制逻辑对 theta=0 和非 0 统一处理，不走特殊路径 |
| 图像 `naturalWidth/Height` 在 `<img>` load 之前为 0 | 监听 `img.onload` 重画；首次进入瓦片时若图未加载完，不绘制（下一次 onload 自然触发） |
| Detection2DArray 消息里 results 为空数组 | 提取器返回 `id=""` `score=null`；前端标签逻辑遇到空 id 时不画标签底条 |
| frame_id 与相机 topic 命名不一致（比如 `front_camera_link`） | 子串匹配作为默认启发式；若未来误配，方案 B 的架构允许加 UI 兜底（下拉框手选），不需要重构 |

## 实现顺序

1. 后端：写 `extract_detection2d_array` + 改 `build_manifest` + 改 `finalize_topic_entry`
2. 后端测试：`tests/test_detection2d_export.py`
3. 前端数据层：`getDetection2DTopics`、`findMatchingDetectionStream`、`findNearestDetectionSample`（**用户实现 `extractCameraKeyword` 与 `findMatchingDetectionStream`**）
4. 前端渲染层：DOM + CSS + `drawBBoxes`（**用户实现 `drawBBoxes` 核心绘制循环**）
5. 前端集成：`updateImageTile` 叠加 canvas、checkbox 事件、resize 重画
6. 手动验证：在用户 bag 上跑通

## 用户贡献点

按学习模式，以下两处留给用户实现：

1. **`extractCameraKeyword` + `findMatchingDetectionStream`**（约 10 行）：决定 frame_id 的子串匹配策略
2. **`drawBBoxes` 核心循环**（约 8-12 行）：canvas 2D 绘图 API 实操

其余脚手架（提取器、DOM、事件绑定、时间对齐二分）由 Claude 实现。
