const DEFAULT_COLORS = [
  '#5ba2ff',
  '#47c97e',
  '#f59e0b',
  '#fb7185',
  '#a78bfa',
  '#22d3ee',
  '#f97316',
];

const THEME_DEFAULTS = {
  accent: '#5ba2ff',
  bottomTint: '#6bd6ff',
  bottomGlow: 58,
  panelLift: 46,
};

const THEME_STORAGE_KEY = 'bag-studio:theme';
const LAYOUT_PRESET_STORAGE_KEY = 'bag-studio:layout-presets';
const TIMELINE_SERIES_GROUP_ID = 'timeline';
const BUILTIN_DEFAULT_PRESET_ID = 'builtin:default';
const CURSOR_SLIDER_STEPS = 1000;
const RECORDING_DEFAULTS = {
  width: 1920,
  height: 1080,
  fps: 20,
  playbackRate: 4,
  maxFrames: 900,
};

const FULL_VIEW_CONFIG = {
  showSidebar: true,
  showImage: true,
  showTimeline: true,
  showXY: true,
  showOdom: true,
};

const DEFAULT_VIEW_CONFIG = { ...FULL_VIEW_CONFIG };

const state = {
  indexData: null,
  manifest: null,
  subplots: [],
  seriesConfigs: [],
  nextSeriesId: 1,
  activeDatasetBaseUrl: null,
  odomConfig: {
    topic: '',
    mode: 'identity',
    tx: 0,
    ty: 0,
    yawDeg: 0,
    localXYEnabled: false,
    localCoordinateMode: 'xy',
    localXSourceKey: '',
    localYSourceKey: '',
    localXExpr: 'x',
    localYExpr: 'y',
  },
  cursor: {
    t: 0,
    tMin: 0,
    tMax: 0,
  },
  imageViewer: {
    panels: [],
    primaryFrameIndex: -1,
    fullscreenPanelIdx: -1,
    fullscreenFrameIdx: -1,
    gridSignature: '',
  },
  seriesEditor: {
    isOpen: false,
    targetId: null,
    isNew: false,
    draft: null,
  },
  theme: { ...THEME_DEFAULTS },
  layoutPresets: [],
  activeLayoutPresetId: BUILTIN_DEFAULT_PRESET_ID,
  viewConfig: { ...DEFAULT_VIEW_CONFIG },
  recording: {
    isActive: false,
    isExporting: false,
    isConvertingMp4: false,
    stopRequested: false,
    fps: RECORDING_DEFAULTS.fps,
    playbackRate: RECORDING_DEFAULTS.playbackRate,
    recorder: null,
    stream: null,
    canvas: null,
    lastBlob: null,
    lastWebmFileName: '',
    lastDownloadUrl: '',
  },
};

const el = {
  emptyState: document.getElementById('empty-state'),
  appMain: document.getElementById('app-main'),
  datasetSelect: document.getElementById('dataset-select'),
  reloadBtn: document.getElementById('reload-btn'),
  bagTopicSummary: document.getElementById('bag-topic-summary'),
  bagTopicCount: document.getElementById('bag-topic-count'),
  bagTopicList: document.getElementById('bag-topic-list'),
  seriesList: document.getElementById('series-list'),
  addNumericSeries: document.getElementById('add-numeric-series'),
  addStringSeries: document.getElementById('add-string-series'),
  odomTopicSelect: document.getElementById('odom-topic-select'),
  transformModeSelect: document.getElementById('transform-mode-select'),
  txInput: document.getElementById('tx-input'),
  tyInput: document.getElementById('ty-input'),
  yawInput: document.getElementById('yaw-input'),
  odomLocalEnable: document.getElementById('odom-local-enable'),
  odomLocalCopy: document.getElementById('odom-local-copy'),
  odomLocalCoordinateMode: document.getElementById('odom-local-coordinate-mode'),
  odomLocalXLabel: document.getElementById('odom-local-x-label'),
  odomLocalYLabel: document.getElementById('odom-local-y-label'),
  odomLocalXSelect: document.getElementById('odom-local-x-select'),
  odomLocalYSelect: document.getElementById('odom-local-y-select'),
  odomLocalXExprLabel: document.getElementById('odom-local-x-expr-label'),
  odomLocalYExprLabel: document.getElementById('odom-local-y-expr-label'),
  odomLocalXExpr: document.getElementById('odom-local-x-expr'),
  odomLocalYExpr: document.getElementById('odom-local-y-expr'),
  odomLocalPresetCartesian: document.getElementById('odom-local-preset-cartesian'),
  odomLocalPresetPolar: document.getElementById('odom-local-preset-polar'),
  odomLocalStatus: document.getElementById('odom-local-status'),
  odomLocalPreviewCopy: document.getElementById('odom-local-preview-copy'),
  odomLocalPreviewCanvas: document.getElementById('odom-local-preview-canvas'),
  addSubplot: document.getElementById('add-subplot'),
  cleanupSubplots: document.getElementById('cleanup-subplots'),
  layoutPresetSelect: document.getElementById('layout-preset-select'),
  saveDefaultLayoutBtn: document.getElementById('save-default-layout'),
  deleteLayoutPresetBtn: document.getElementById('delete-layout-preset'),
  workspaceGrid: document.getElementById('workspace-grid'),
  sidebarPanel: document.getElementById('sidebar-panel'),
  topVisualGrid: document.getElementById('top-visual-grid'),
  imagePanel: document.getElementById('image-panel'),
  timelinePanel: document.getElementById('timeline-panel'),
  plotPanels: document.getElementById('plot-panels'),
  xyPanelSection: document.getElementById('xy-panel-section'),
  xyPlotPanels: document.getElementById('plot-panels'),
  trajectoryCanvas: document.getElementById('trajectory-canvas'),
  odomTrajectoryPanel: document.getElementById('odom-trajectory-panel'),
  odomConfigPanel: document.getElementById('odom-config-panel'),
  trajectorySummary: document.getElementById('trajectory-summary'),
  timelineCanvas: document.getElementById('timeline-canvas'),
  cursorSlider: document.getElementById('cursor-slider'),
  cursorMeta: document.getElementById('cursor-meta'),
  cursorSamples: document.getElementById('cursor-samples'),
  recordPlaybackBtn: document.getElementById('record-playback-btn'),
  downloadMp4Btn: document.getElementById('download-mp4-btn'),
  recordingStatus: document.getElementById('recording-status'),
  cursorToStart: document.getElementById('cursor-to-start'),
  cursorToEnd: document.getElementById('cursor-to-end'),
  prevFrameBtn: document.getElementById('prev-frame-btn'),
  nextFrameBtn: document.getElementById('next-frame-btn'),
  addImagePanelBtn: document.getElementById('add-image-panel'),
  imageGrid: document.getElementById('image-grid'),
  imageEmpty: document.getElementById('image-empty'),
  fullscreenOverlay: document.getElementById('image-fullscreen'),
  fullscreenImg: document.getElementById('fullscreen-img'),
  fullscreenMeta: document.getElementById('fullscreen-meta'),
  fullscreenClose: document.getElementById('fullscreen-close'),
  fullscreenPrev: document.getElementById('fullscreen-prev'),
  fullscreenNext: document.getElementById('fullscreen-next'),
  accentColorInput: document.getElementById('accent-color-input'),
  bottomTintInput: document.getElementById('bottom-tint-input'),
  bottomGlowInput: document.getElementById('bottom-glow-input'),
  panelLiftInput: document.getElementById('panel-lift-input'),
  resetThemeBtn: document.getElementById('reset-theme-btn'),
  bagLoader: document.getElementById('bag-loader'),
  bagPathInput: document.getElementById('bag-path-input'),
  pickDirBtn: document.getElementById('pick-dir-btn'),
  parseBtn: document.getElementById('parse-btn'),
  parseProgress: document.getElementById('parse-progress'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),
  parseError: document.getElementById('parse-error'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeToggleIndicator: document.getElementById('theme-toggle-indicator'),
  themeDockBody: document.getElementById('theme-dock-body'),
  odomToggleBtn: document.getElementById('odom-toggle-btn'),
  odomToggleIndicator: document.getElementById('odom-toggle-indicator'),
  odomPanelBody: document.getElementById('odom-panel-body'),
  seriesModal: document.getElementById('series-modal'),
  seriesModalTitle: document.getElementById('series-modal-title'),
  seriesModalClose: document.getElementById('series-modal-close'),
  seriesModalLabel: document.getElementById('series-modal-label'),
  seriesModalType: document.getElementById('series-modal-type'),
  seriesModalColor: document.getElementById('series-modal-color'),
  seriesModalScale: document.getElementById('series-modal-scale'),
  seriesModalTopic: document.getElementById('series-modal-topic'),
  seriesModalFieldWrap: document.getElementById('series-modal-field-wrap'),
  seriesModalField: document.getElementById('series-modal-field'),
  seriesModalStringFieldWrap: document.getElementById('series-modal-string-field-wrap'),
  seriesModalStringField: document.getElementById('series-modal-string-field'),
  seriesModalParserModeWrap: document.getElementById('series-modal-parser-mode-wrap'),
  seriesModalParserMode: document.getElementById('series-modal-parser-mode'),
  seriesModalCaptureWrap: document.getElementById('series-modal-capture-wrap'),
  seriesModalCaptureLabel: document.getElementById('series-modal-capture-label'),
  seriesModalCapture: document.getElementById('series-modal-capture'),
  seriesModalPatternWrap: document.getElementById('series-modal-pattern-wrap'),
  seriesModalPatternLabel: document.getElementById('series-modal-pattern-label'),
  seriesModalPattern: document.getElementById('series-modal-pattern'),
  seriesModalHelp: document.getElementById('series-modal-help'),
  seriesModalCancel: document.getElementById('series-modal-cancel'),
  seriesModalSave: document.getElementById('series-modal-save'),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmtNumber(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toFixed(digits);
}

function fmtSec(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `T+${Number(value).toFixed(6)}s`;
}

function fmtAbsoluteSecFromOrigin(relativeSec) {
  const origin = state.manifest?.bag?.timeline_origin_iso;
  if (!origin || relativeSec === null || relativeSec === undefined || Number.isNaN(relativeSec)) return '';
  const baseMs = new Date(origin).getTime();
  if (!Number.isFinite(baseMs)) return '';
  const ts = new Date(baseMs + Number(relativeSec) * 1000);
  return ts.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function normalizeLocalCoordinateMode(value) {
  return value === 'polar' ? 'polar' : 'xy';
}

function getLocalCoordinateModeDefaults(mode) {
  if (mode === 'polar') {
    return {
      xExpr: 'r * cos(theta * PI / 180)',
      yExpr: 'r * sin(theta * PI / 180)',
    };
  }
  return {
    xExpr: 'x',
    yExpr: 'y',
  };
}

function isDistanceLikeSource(source) {
  const field = String(source?.field || '').toLowerCase();
  const label = String(source?.label || '').toLowerCase();
  return field === 'distance'
    || field.endsWith('.distance')
    || field.includes('range')
    || label.includes('distance')
    || label.includes('range');
}

function isAngleLikeSource(source) {
  const field = String(source?.field || '').toLowerCase();
  const label = String(source?.label || '').toLowerCase();
  return field === 'azimuth'
    || field.endsWith('.azimuth')
    || field.includes('angle')
    || field.includes('theta')
    || label.includes('azimuth')
    || label.includes('angle')
    || label.includes('theta');
}

function isCartesianXLikeSource(source) {
  const field = String(source?.field || '').toLowerCase();
  const label = String(source?.label || '').toLowerCase();
  return field === 'x'
    || field.endsWith('.position.x')
    || label.includes(' position.x')
    || label.endsWith(' x')
    || label.includes('· x');
}

function isCartesianYLikeSource(source) {
  const field = String(source?.field || '').toLowerCase();
  const label = String(source?.label || '').toLowerCase();
  return field === 'y'
    || field.endsWith('.position.y')
    || label.includes(' position.y')
    || label.endsWith(' y')
    || label.includes('· y');
}

function getSuggestedLocalSourceKeys(mode, sources = getGlobalNumericFieldSources()) {
  if (!sources.length) {
    return { xKey: '', yKey: '' };
  }

  if (mode === 'polar') {
    const distanceSource = sources.find(isDistanceLikeSource) || sources[0];
    const angleSource = sources.find((source) => source.key !== distanceSource.key && isAngleLikeSource(source))
      || sources.find((source) => source.key !== distanceSource.key)
      || distanceSource;
    return { xKey: distanceSource.key, yKey: angleSource.key };
  }

  const xSource = sources.find(isCartesianXLikeSource) || sources[0];
  const exactXSource = sources.find((source) => {
    const field = String(source?.field || '').toLowerCase();
    const label = String(source?.label || '').toLowerCase();
    return field === 'pose.pose.position.x' || field.endsWith('.position.x') || label.includes('pose.pose.position.x');
  });
  const xPreferred = exactXSource || xSource;
  const exactYSource = sources.find((source) => {
    const field = String(source?.field || '').toLowerCase();
    const label = String(source?.label || '').toLowerCase();
    return source.key !== xPreferred.key && (field === 'pose.pose.position.y' || field.endsWith('.position.y') || label.includes('pose.pose.position.y'));
  });
  const ySource = exactYSource
    || sources.find((source) => source.key !== xPreferred.key && isCartesianYLikeSource(source))
    || sources.find((source) => source.key !== xPreferred.key)
    || xPreferred;
  return { xKey: xPreferred.key, yKey: ySource.key };
}

function isLikelyLegacyPolarConfig(config = state.odomConfig) {
  const normalizedX = String(config.localXExpr || '').toLowerCase().replace(/\s+/g, '');
  const normalizedY = String(config.localYExpr || '').toLowerCase().replace(/\s+/g, '');
  if (normalizedX.includes('cos(') && normalizedY.includes('sin(')) {
    return true;
  }
  const sources = getGlobalNumericFieldSources();
  const xSource = sources.find((source) => source.key === config.localXSourceKey);
  const ySource = sources.find((source) => source.key === config.localYSourceKey);
  return isDistanceLikeSource(xSource) && isAngleLikeSource(ySource);
}

function getOdomLocalModeMeta(mode = state.odomConfig.localCoordinateMode) {
  if (mode === 'polar') {
    return {
      copy: '直接选择距离字段和方位角字段，系统会用当前公式换算出局部 XY，再按 Odom 位姿转换到全局坐标。',
      xLabel: '距离字段',
      yLabel: '方位角字段',
      xExprLabel: '局部 X 公式',
      yExprLabel: '局部 Y 公式',
      xExprPlaceholder: '例如 r * cos(theta * PI / 180)',
      yExprPlaceholder: '例如 r * sin(theta * PI / 180)',
      previewCopy: '由距离 / 方位角换算后的局部 XY',
      statusHint: '极坐标模式变量：r / theta / distance / angle / x / y / t，可用函数：sin cos tan abs sqrt pow PI',
    };
  }
  return {
    copy: '直接读取局部坐标系的 X / Y 字段，再按当前 Odom 位姿转换到全局坐标。',
    xLabel: 'X 字段',
    yLabel: 'Y 字段',
    xExprLabel: '局部 X 公式',
    yExprLabel: '局部 Y 公式',
    xExprPlaceholder: '例如 x / 1000',
    yExprPlaceholder: '例如 y / 1000',
    previewCopy: '表达式生成后的局部 XY',
    statusHint: 'XY 模式变量：x / y / r / theta / distance / angle / t，可用函数：sin cos tan abs sqrt pow PI',
  };
}

function syncOdomLocalModeUi() {
  const mode = normalizeLocalCoordinateMode(state.odomConfig.localCoordinateMode);
  const meta = getOdomLocalModeMeta(mode);
  if (el.odomLocalCoordinateMode) el.odomLocalCoordinateMode.value = mode;
  if (el.odomLocalCopy) el.odomLocalCopy.textContent = meta.copy;
  if (el.odomLocalXLabel) el.odomLocalXLabel.textContent = meta.xLabel;
  if (el.odomLocalYLabel) el.odomLocalYLabel.textContent = meta.yLabel;
  if (el.odomLocalXExprLabel) el.odomLocalXExprLabel.textContent = meta.xExprLabel;
  if (el.odomLocalYExprLabel) el.odomLocalYExprLabel.textContent = meta.yExprLabel;
  if (el.odomLocalXExpr) el.odomLocalXExpr.placeholder = meta.xExprPlaceholder;
  if (el.odomLocalYExpr) el.odomLocalYExpr.placeholder = meta.yExprPlaceholder;
  if (el.odomLocalPreviewCopy) el.odomLocalPreviewCopy.textContent = meta.previewCopy;
}

function applyOdomLocalCoordinateMode(mode, { preferSuggestedSources = false, resetExpressions = false } = {}) {
  const normalizedMode = normalizeLocalCoordinateMode(mode);
  state.odomConfig.localCoordinateMode = normalizedMode;

  if (preferSuggestedSources) {
    const suggestedKeys = getSuggestedLocalSourceKeys(normalizedMode);
    state.odomConfig.localXSourceKey = suggestedKeys.xKey;
    state.odomConfig.localYSourceKey = suggestedKeys.yKey;
  }

  if (resetExpressions || !state.odomConfig.localXExpr || !state.odomConfig.localYExpr) {
    const defaults = getLocalCoordinateModeDefaults(normalizedMode);
    state.odomConfig.localXExpr = defaults.xExpr;
    state.odomConfig.localYExpr = defaults.yExpr;
  }
}

function nextColor() {
  const color = DEFAULT_COLORS[(state.nextSeriesId - 1) % DEFAULT_COLORS.length];
  state.nextSeriesId += 1;
  return color;
}

function nextSeriesId() {
  return `series_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createSubplot(title) {
  return {
    id: `subplot_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    title: title || `坐标组 ${state.subplots.length + 1}`,
    mode: 'xy',
    xSeriesId: '',
    ySeriesId: '',
    useOdomTransform: false,
    slot: state.subplots.length + 1,
  };
}

function getSubplotById(subplotId) {
  return state.subplots.find((subplot) => subplot.id === subplotId) || null;
}

function normalizeSubplotConfig(subplot, seriesList = []) {
  if (!Number.isFinite(Number(subplot.slot))) subplot.slot = 1;
  if (typeof subplot.useOdomTransform !== 'boolean') subplot.useOdomTransform = false;
  subplot.mode = 'xy';
  const globalSources = getGlobalNumericFieldSources();
  const keys = new Set(globalSources.map((source) => source.key));
  if (!keys.has(subplot.xSeriesId)) subplot.xSeriesId = globalSources[0]?.key || '';
  const fallbackY = globalSources.find((source) => source.key !== subplot.xSeriesId)?.key || globalSources[0]?.key || '';
  if (!keys.has(subplot.ySeriesId) || subplot.ySeriesId === subplot.xSeriesId) subplot.ySeriesId = fallbackY;
}

function getSubplotSlotOptionList(selectedValue, totalCount) {
  const maxSlots = Math.max(4, totalCount);
  return Array.from({ length: maxSlots }, (_, index) => index + 1)
    .map((slot) => `<option value="${slot}" ${Number(selectedValue) === slot ? 'selected' : ''}>位置 ${slot}</option>`)
    .join('');
}

function getSubplotOptionList(selectedId) {
  return state.subplots
    .map((subplot) => `<option value="${escapeHtml(subplot.id)}" ${subplot.id === selectedId ? 'selected' : ''}>${escapeHtml(subplot.title)}</option>`)
    .join('');
}

function getTopics() {
  if (!state.manifest) return [];
  const topics = state.manifest.topics || {};
  const order = state.manifest.topic_order || Object.keys(topics);
  return order.map((name) => topics[name]).filter(Boolean);
}

function getUsefulStringFields(topic) {
  return (topic?.available_string_fields || []).filter((field) => !field.endsWith('frame_id') && field !== 'format');
}

function getTopic(topicName) {
  if (!state.manifest) return null;
  return state.manifest.topics?.[topicName] || null;
}

function getNumericTopics() {
  return getTopics().filter((topic) => !topic.skipped && (topic.available_numeric_fields || []).length > 0);
}

function getStringTopics() {
  return getTopics().filter((topic) => !topic.skipped && getUsefulStringFields(topic).length > 0);
}

function getOdomTopics() {
  return getTopics().filter((topic) => topic.odom_track && topic.odom_track.count > 0);
}


function getGlobalNumericFieldSources() {
  return getNumericTopics().flatMap((topic) =>
    (topic.available_numeric_fields || []).map((field) => ({
      key: `${topic.name}::${field}`,
      topic: topic.name,
      field,
      label: `${topic.name} · ${field}`,
    })),
  );
}

function getGlobalNumericFieldOptionList(selectedKey) {
  return getGlobalNumericFieldSources()
    .map((source) => `<option value="${escapeHtml(source.key)}" ${source.key === selectedKey ? 'selected' : ''}>${escapeHtml(source.label)}</option>`)
    .join('');
}

function buildSeriesDataFromSource(sourceKey) {
  const source = getGlobalNumericFieldSources().find((item) => item.key === sourceKey);
  if (!source) return null;
  const topic = getTopic(source.topic);
  const series = topic?.numeric_fields?.[source.field];
  if (!series) return null;
  const points = series.t.map((t, index) => ({ t, v: series.v[index] }));
  const values = points.map((point) => point.v);
  return {
    id: source.key,
    label: source.label,
    color: '#5ba2ff',
    points,
    stats: {
      count: series.count,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    },
  };
}


function serializeSeriesPreset(config) {
  return {
    type: config.type,
    label: config.label || '',
    color: config.color,
    scale: Number(config.scale ?? 1) || 1,
    topic: config.topic || '',
    field: config.field || '',
    stringField: config.stringField || '',
    parserMode: config.parserMode || 'regex',
    pattern: config.pattern || '',
    capture: config.capture || '1',
  };
}

function serializeCoordinatePreset(subplot) {
  const sourceMap = new Map(getGlobalNumericFieldSources().map((source) => [source.key, source]));
  const xSource = sourceMap.get(subplot.xSeriesId);
  const ySource = sourceMap.get(subplot.ySeriesId);
  return {
    title: subplot.title,
    xTopic: xSource?.topic || '',
    xField: xSource?.field || '',
    yTopic: ySource?.topic || '',
    yField: ySource?.field || '',
    useOdomTransform: !!subplot.useOdomTransform,
  };
}

function createLayoutPresetPayload(name) {
  return {
    id: `layout_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    name,
    saved_at: new Date().toISOString(),
    timeline_series: state.seriesConfigs.map(serializeSeriesPreset),
    xy_groups: state.subplots.map(serializeCoordinatePreset),
    odom_overlay: {
      topic: state.odomConfig.topic,
      mode: state.odomConfig.mode,
      tx: state.odomConfig.tx,
      ty: state.odomConfig.ty,
      yawDeg: state.odomConfig.yawDeg,
      localXYEnabled: state.odomConfig.localXYEnabled,
      localCoordinateMode: state.odomConfig.localCoordinateMode,
      localXSourceKey: state.odomConfig.localXSourceKey,
      localYSourceKey: state.odomConfig.localYSourceKey,
      localXExpr: state.odomConfig.localXExpr,
      localYExpr: state.odomConfig.localYExpr,
    },
    view: { ...state.viewConfig },
  };
}

function loadLayoutPresets() {
  try {
    const raw = window.localStorage.getItem(LAYOUT_PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function persistLayoutPresets() {
  try {
    window.localStorage.setItem(LAYOUT_PRESET_STORAGE_KEY, JSON.stringify(state.layoutPresets));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function normalizeViewConfig(view, fallback = FULL_VIEW_CONFIG) {
  return {
    showSidebar: view?.showSidebar ?? fallback.showSidebar,
    showImage: view?.showImage ?? fallback.showImage,
    showTimeline: view?.showTimeline ?? fallback.showTimeline,
    showXY: view?.showXY ?? fallback.showXY,
    showOdom: view?.showOdom ?? fallback.showOdom,
  };
}

function createDefaultLayoutPreset() {
  return {
    id: BUILTIN_DEFAULT_PRESET_ID,
    name: '默认配置',
    builtin: true,
    saved_at: 'builtin',
    timeline_series: [],
    xy_groups: [],
    odom_overlay: null,
    view: { ...DEFAULT_VIEW_CONFIG },
  };
}

function getAvailableLayoutPresets() {
  return [createDefaultLayoutPreset(), ...(state.layoutPresets || [])];
}

function isReadonlyLayoutPreset(preset) {
  return !!preset?.builtin;
}

function syncLayoutPresetControls() {
  const preset = getSelectedLayoutPreset();
  if (el.deleteLayoutPresetBtn) {
    el.deleteLayoutPresetBtn.disabled = !preset || isReadonlyLayoutPreset(preset);
  }
}

function syncLayoutPresetSelect() {
  if (!el.layoutPresetSelect) return;
  const presets = getAvailableLayoutPresets();
  el.layoutPresetSelect.innerHTML = presets.length
    ? presets.map((preset) => `<option value="${escapeHtml(preset.id)}" ${preset.id === state.activeLayoutPresetId ? 'selected' : ''}>${escapeHtml(preset.name)}</option>`).join('')
    : '<option value="">（暂无模板）</option>';
  el.layoutPresetSelect.disabled = presets.length === 0;
  syncLayoutPresetControls();
}

function saveDefaultLayoutPreset(name, targetId = '') {
  try {
    const presetName = String(name || '').trim();
    if (!presetName) return false;
    const conflict = getAvailableLayoutPresets().find((item) => item.name === presetName && item.id !== targetId);
    if (conflict) return false;
    const payload = createLayoutPresetPayload(presetName);
    const existingIndex = state.layoutPresets.findIndex((item) => item.id === targetId);
    if (existingIndex >= 0) {
      payload.id = state.layoutPresets[existingIndex].id;
      state.layoutPresets.splice(existingIndex, 1, payload);
    } else {
      state.layoutPresets.push(payload);
    }
    state.activeLayoutPresetId = payload.id;
    syncLayoutPresetSelect();
    return persistLayoutPresets();
  } catch (error) {
    console.error(error);
    return false;
  }
}

function getSelectedLayoutPreset() {
  const presetId = el.layoutPresetSelect?.value || state.activeLayoutPresetId;
  return getAvailableLayoutPresets().find((item) => item.id === presetId) || null;
}

function buildSeriesConfigFromPreset(item) {
  if (!item?.topic) return null;
  const topic = getTopic(item.topic);
  if (!topic || topic.skipped) return null;
  if (item.type === 'string') {
    const fields = getUsefulStringFields(topic);
    if (!fields.includes(item.stringField)) return null;
    const config = createStringSeriesConfig();
    config.topic = item.topic;
    config.stringField = item.stringField;
    config.parserMode = item.parserMode || 'regex';
    config.pattern = item.pattern || '';
    config.capture = item.capture || '1';
    config.label = item.label || '';
    config.color = item.color || config.color;
    config.scale = Number(item.scale ?? 1) || 1;
    return config;
  }
  const numericFields = topic.available_numeric_fields || [];
  if (!numericFields.includes(item.field)) return null;
  const config = createNumericSeriesConfig(item.topic, item.field);
  config.label = item.label || '';
  config.color = item.color || config.color;
  config.scale = Number(item.scale ?? 1) || 1;
  return config;
}

function buildCoordinateGroupFromPreset(item, index) {
  const sources = getGlobalNumericFieldSources();
  const xSource = sources.find((source) => source.topic === item.xTopic && source.field === item.xField);
  const ySource = sources.find((source) => source.topic === item.yTopic && source.field === item.yField);
  if (!xSource || !ySource) return null;
  const subplot = createSubplot(item.title || `坐标组 ${index + 1}`);
  subplot.title = item.title || `坐标组 ${index + 1}`;
  subplot.xSeriesId = xSource.key;
  subplot.ySeriesId = ySource.key;
  subplot.useOdomTransform = !!item.useOdomTransform;
  subplot.slot = index + 1;
  return subplot;
}

function applyDefaultLayoutPreset(options = {}) {
  const preset = getSelectedLayoutPreset() || getAvailableLayoutPresets()[0] || null;
  if (!preset) return false;
  const nextSeries = (preset.timeline_series || [])
    .map(buildSeriesConfigFromPreset)
    .filter(Boolean);
  const nextGroups = (preset.xy_groups || [])
    .map((item, index) => buildCoordinateGroupFromPreset(item, index))
    .filter(Boolean);
  state.seriesConfigs = nextSeries;
  state.subplots = nextGroups;
  state.viewConfig = normalizeViewConfig(preset.view, FULL_VIEW_CONFIG);
  if (preset.odom_overlay) {
    const inferredLocalMode = preset.odom_overlay.localCoordinateMode
      || (isLikelyLegacyPolarConfig(preset.odom_overlay) ? 'polar' : 'xy');
    state.odomConfig.topic = preset.odom_overlay.topic || state.odomConfig.topic;
    state.odomConfig.mode = preset.odom_overlay.mode || state.odomConfig.mode;
    state.odomConfig.tx = Number(preset.odom_overlay.tx || 0);
    state.odomConfig.ty = Number(preset.odom_overlay.ty || 0);
    state.odomConfig.yawDeg = Number(preset.odom_overlay.yawDeg || 0);
    state.odomConfig.localXYEnabled = !!preset.odom_overlay.localXYEnabled;
    state.odomConfig.localCoordinateMode = normalizeLocalCoordinateMode(inferredLocalMode);
    state.odomConfig.localXSourceKey = preset.odom_overlay.localXSourceKey || '';
    state.odomConfig.localYSourceKey = preset.odom_overlay.localYSourceKey || '';
    state.odomConfig.localXExpr = preset.odom_overlay.localXExpr || getLocalCoordinateModeDefaults(state.odomConfig.localCoordinateMode).xExpr;
    state.odomConfig.localYExpr = preset.odom_overlay.localYExpr || getLocalCoordinateModeDefaults(state.odomConfig.localCoordinateMode).yExpr;
  }
  if (!options.silent) {
    renderSeriesList();
    syncOdomControls();
    renderVisuals();
  }
  return nextSeries.length > 0 || nextGroups.length > 0 || !!preset.odom_overlay || !!preset.view;
}


function deleteSelectedLayoutPreset() {
  const preset = getSelectedLayoutPreset();
  if (!preset) return false;
  if (isReadonlyLayoutPreset(preset)) return false;
  state.layoutPresets = (state.layoutPresets || []).filter((item) => item.id !== preset.id);
  state.activeLayoutPresetId = BUILTIN_DEFAULT_PRESET_ID;
  syncLayoutPresetSelect();
  return persistLayoutPresets();
}


function findGlobalNumericSource(matchers) {
  const sources = getGlobalNumericFieldSources();
  return sources.find((source) => matchers.some((matcher) => matcher(source)));
}

function createDefaultCoordinateGroups() {
  const groups = [];
  const odomX = findGlobalNumericSource([
    (source) => source.field === 'pose.pose.position.x',
    (source) => source.label.includes('pose.pose.position.x'),
  ]);
  const odomY = findGlobalNumericSource([
    (source) => source.field === 'pose.pose.position.y',
    (source) => source.label.includes('pose.pose.position.y'),
  ]);
  if (odomX && odomY) {
    const group = createSubplot('坐标组 1');
    group.xSeriesId = odomX.key;
    group.ySeriesId = odomY.key;
    groups.push(group);
  }

  const uwbDistance = findGlobalNumericSource([
    (source) => source.field === 'distance',
    (source) => source.field.endsWith('.distance'),
    (source) => source.label.toLowerCase().includes('distance'),
  ]);
  const uwbAzimuth = findGlobalNumericSource([
    (source) => source.field === 'azimuth',
    (source) => source.field.endsWith('.azimuth'),
    (source) => source.label.toLowerCase().includes('azimuth'),
  ]);
  if (uwbDistance && uwbAzimuth) {
    const group = createSubplot(`坐标组 ${groups.length + 1}`);
    group.xSeriesId = uwbDistance.key;
    group.ySeriesId = uwbAzimuth.key;
    groups.push(group);
  }

  if (!groups.length) {
    const sources = getGlobalNumericFieldSources();
    if (sources[0] && sources[1]) {
      const group = createSubplot('坐标组 1');
      group.xSeriesId = sources[0].key;
      group.ySeriesId = sources[1].key;
      groups.push(group);
    } else if (sources[0]) {
      const group = createSubplot('坐标组 1');
      group.xSeriesId = sources[0].key;
      group.ySeriesId = sources[0].key;
      groups.push(group);
    }
  }

  return groups;
}

function getSeriesSourceSummary(config) {
  const topic = getTopic(config.topic);
  if (!topic) return '未选择数据源';
  if (config.type === 'numeric') {
    return `${topic.name} · ${config.field || '未选择字段'}`;
  }
  return `${topic.name} · ${config.stringField || '未选择字符串字段'} · ${config.parserMode || 'regex'}`;
}

function getSeriesLabel(config) {
  const topic = getTopic(config.topic);
  if (config.label && config.label.trim()) return config.label.trim();
  if (!topic) return '未配置系列';
  if (config.type === 'numeric') {
    return `${topic.name} · ${config.field || '字段'}`;
  }
  return `${topic.name} · ${config.stringField || '字符串'} · ${config.parserMode}`;
}

function compactSeriesLabel(label) {
  const text = String(label || '').trim();
  if (!text) return '未命名字段';
  const parts = text.split('·').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} · ${parts[parts.length - 1]}`;
  }
  return text;
}


function getOptionList(values, selectedValue) {
  return values
    .map((value) => {
      const selected = value === selectedValue ? 'selected' : '';
      return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(value)}</option>`;
    })
    .join('');
}

function normalizeSeriesConfig(config) {
  if (config.collapsed === undefined) config.collapsed = false;
  if (config.scale === undefined || config.scale === null || Number.isNaN(Number(config.scale))) config.scale = 1;
  config.subplotId = TIMELINE_SERIES_GROUP_ID;
  if (config.type === 'numeric') {
    const numericTopics = getNumericTopics();
    if (!numericTopics.length) return;
    if (!numericTopics.some((topic) => topic.name === config.topic)) {
      config.topic = numericTopics[0].name;
    }
    const topic = getTopic(config.topic);
    const fields = topic?.available_numeric_fields || [];
    if (!fields.includes(config.field)) {
      config.field = fields[0] || '';
    }
  } else {
    const stringTopics = getStringTopics();
    if (!stringTopics.length) return;
    if (!stringTopics.some((topic) => topic.name === config.topic)) {
      config.topic = stringTopics[0].name;
    }
    const topic = getTopic(config.topic);
    const fields = getUsefulStringFields(topic);
    if (!fields.includes(config.stringField)) {
      config.stringField = fields[0] || '';
    }
    if (!config.parserMode) config.parserMode = 'regex';
    if (config.capture === undefined) config.capture = '1';
  }
}

function createNumericSeriesConfig(topicName, fieldName, subplotId) {
  const numericTopics = getNumericTopics();
  const topic = topicName || (numericTopics[0] ? numericTopics[0].name : '');
  const resolvedTopic = getTopic(topic);
  const field = fieldName || (resolvedTopic?.available_numeric_fields?.[0] || '');
  return {
    id: nextSeriesId(),
    type: 'numeric',
    label: '',
    color: nextColor(),
    scale: 1,
    topic,
    field,
    subplotId: TIMELINE_SERIES_GROUP_ID,
    collapsed: false,
  };
}

function createStringSeriesConfig(subplotId) {
  const stringTopics = getStringTopics();
  const topic = stringTopics[0] ? stringTopics[0].name : '';
  const resolvedTopic = getTopic(topic);
  const stringFields = getUsefulStringFields(resolvedTopic);
  return {
    id: nextSeriesId(),
    type: 'string',
    label: '',
    color: nextColor(),
    scale: 1,
    topic,
    stringField: stringFields[0] || '',
    parserMode: 'regex',
    pattern: 'value=([-+]?\\d*\\.?\\d+)',
    capture: '1',
    subplotId: TIMELINE_SERIES_GROUP_ID,
    collapsed: false,
  };
}

function createDefaultSeries() {
  const configs = [];
  const odomTopic = getOdomTopics()[0];
  if (odomTopic) {
    const fields = odomTopic.available_numeric_fields || [];
    if (fields.includes('pose.pose.position.x')) {
      configs.push(createNumericSeriesConfig(odomTopic.name, 'pose.pose.position.x'));
    }
    if (fields.includes('pose.pose.position.y')) {
      configs.push(createNumericSeriesConfig(odomTopic.name, 'pose.pose.position.y'));
    }
  }

  const numericTopics = getNumericTopics();
  outer: for (const topic of numericTopics) {
    for (const field of topic.available_numeric_fields || []) {
      if (field === 'distance' || field.endsWith('.distance')) {
        configs.push(createNumericSeriesConfig(topic.name, field));
        break outer;
      }
    }
  }

  if (!configs.length && numericTopics[0]) {
    configs.push(createNumericSeriesConfig(numericTopics[0].name, numericTopics[0].available_numeric_fields?.[0] || ''));
  }

  const finalConfigs = configs.slice(0, 3);
  finalConfigs.forEach((config, index) => {
    config.collapsed = index > 0;
  });

  return finalConfigs;
}


function renderSeriesList() {
  el.seriesList.innerHTML = '';

  state.seriesConfigs.forEach((config, index) => {
    normalizeSeriesConfig(config);
    const card = document.createElement('article');
    card.className = 'series-card';
    card.dataset.seriesId = config.id;

    const summaryText = getSeriesSourceSummary(config);

    card.innerHTML = `
      <div class="series-card-header">
        <div class="series-card-title">
          <strong>系列 ${index + 1}</strong>
          <div class="series-chip">
            <span class="series-dot" style="background:${escapeHtml(config.color)}"></span>
            <span>${escapeHtml(config.type === 'numeric' ? '数值字段' : '字符串提取')}</span>
          </div>
        </div>
        <div class="series-card-actions">
          <button type="button" class="ghost-btn small-btn" data-action="edit">编辑</button>
          <button type="button" class="remove-btn" data-action="remove">删除</button>
        </div>
      </div>
      <div class="series-card-summary">${escapeHtml(summaryText)}</div>
      <div class="series-card-meta">
        <span class="meta-pill">颜色 <span class="series-dot" style="background:${escapeHtml(config.color)}"></span></span>
        ${Number(config.scale || 1) !== 1 ? `<span class="meta-pill">倍率 ×${escapeHtml(fmtNumber(config.scale, 3))}</span>` : ''}
        ${config.label ? `<span class="meta-pill">${escapeHtml(config.label)}</span>` : ''}
      </div>
    `;

    bindSeriesCardEvents(card, config);
    el.seriesList.appendChild(card);
  });

  el.addStringSeries.disabled = getStringTopics().length === 0;
  el.addNumericSeries.disabled = getNumericTopics().length === 0;
}

function bindSeriesCardEvents(card, config) {
  card.querySelector('[data-action="edit"]').addEventListener('click', () => {
    openSeriesEditor(config.id);
  });

  card.querySelector('[data-action="remove"]').addEventListener('click', () => {
    state.seriesConfigs = state.seriesConfigs.filter((item) => item.id !== config.id);
    renderSeriesList();
    renderVisuals();
  });
}

function cloneSeriesConfig(config) {
  return JSON.parse(JSON.stringify(config));
}

function getSeriesEditorHelpText(config) {
  if (config.type === 'numeric') return '直接从 ROS 消息结构化字段取值。';
  if (config.parserMode === 'regex') return '正则表达式应包含一个数值捕获组，例如 distance=(\\d+\\.?\\d*)';
  if (config.parserMode === 'json') return '输入 JSON 路径，例如 metrics.distance 或 data[0].x';
  return '输入 key 名，例如 distance，可匹配 key=value / key:value';
}

function syncSeriesEditorDraftFromForm() {
  const draft = state.seriesEditor.draft;
  if (!draft) return;
  draft.label = el.seriesModalLabel.value;
  draft.color = el.seriesModalColor.value;
  draft.scale = parseMaybeNumber(el.seriesModalScale.value) ?? 1;
  const nextType = el.seriesModalType.value;
  if (nextType !== draft.type) {
    const replacement = nextType === 'numeric'
      ? createNumericSeriesConfig()
      : createStringSeriesConfig();
    replacement.id = draft.id;
    replacement.label = draft.label;
    replacement.color = draft.color;
    replacement.scale = draft.scale;
    state.seriesEditor.draft = { ...replacement };
  } else {
    draft.type = nextType;
  }
  state.seriesEditor.draft.topic = el.seriesModalTopic.value;
  if (state.seriesEditor.draft.type === 'numeric') {
    state.seriesEditor.draft.field = el.seriesModalField.value;
  } else {
    state.seriesEditor.draft.stringField = el.seriesModalStringField.value;
    state.seriesEditor.draft.parserMode = el.seriesModalParserMode.value;
    state.seriesEditor.draft.capture = el.seriesModalCapture.value;
    state.seriesEditor.draft.pattern = el.seriesModalPattern.value;
  }
  normalizeSeriesConfig(state.seriesEditor.draft);
}

function renderSeriesEditor() {
  const draft = state.seriesEditor.draft;
  if (!draft) return;
  normalizeSeriesConfig(draft);
  el.seriesModalTitle.textContent = state.seriesEditor.isNew ? '新建系列' : '编辑系列';
  el.seriesModalLabel.value = draft.label || '';
  el.seriesModalType.value = draft.type;
  el.seriesModalColor.value = draft.color;
  el.seriesModalScale.value = String(draft.scale ?? 1);

  const topicNames = (draft.type === 'numeric' ? getNumericTopics() : getStringTopics()).map((item) => item.name);
  el.seriesModalTopic.innerHTML = getOptionList(topicNames, draft.topic);
  el.seriesModalFieldWrap.classList.toggle('hidden', draft.type !== 'numeric');
  el.seriesModalStringFieldWrap.classList.toggle('hidden', draft.type !== 'string');
  el.seriesModalParserModeWrap.classList.toggle('hidden', draft.type !== 'string');
  el.seriesModalCaptureWrap.classList.toggle('hidden', draft.type !== 'string');
  el.seriesModalPatternWrap.classList.toggle('hidden', draft.type !== 'string');

  const topic = getTopic(draft.topic);
  if (draft.type === 'numeric') {
    const fields = topic?.available_numeric_fields || [];
    el.seriesModalField.innerHTML = getOptionList(fields, draft.field);
  } else {
    const stringFields = getUsefulStringFields(topic);
    el.seriesModalStringField.innerHTML = getOptionList(stringFields, draft.stringField);
    el.seriesModalParserMode.value = draft.parserMode || 'regex';
    const isRegex = (draft.parserMode || 'regex') === 'regex';
    const isJson = draft.parserMode === 'json';
    el.seriesModalCaptureLabel.textContent = isRegex ? '捕获组' : '参数';
    el.seriesModalCapture.placeholder = isRegex ? '默认 1' : '可留空';
    el.seriesModalCapture.value = draft.capture || '';
    el.seriesModalPatternLabel.textContent = isRegex ? '正则表达式' : isJson ? 'JSON path' : 'Key 名';
    el.seriesModalPattern.placeholder = isRegex ? 'distance=(\\d+\\.?\\d*)' : isJson ? 'metrics.distance' : 'distance';
    el.seriesModalPattern.value = draft.pattern || '';
  }
  el.seriesModalHelp.textContent = getSeriesEditorHelpText(draft);
}

function closeSeriesEditor() {
  state.seriesEditor = {
    isOpen: false,
    targetId: null,
    isNew: false,
    draft: null,
  };
  el.seriesModal.classList.add('hidden');
  el.seriesModal.setAttribute('aria-hidden', 'true');
}

function openSeriesEditor(seriesId = null, mode = 'edit') {
  const sourceConfig = seriesId
    ? state.seriesConfigs.find((item) => item.id === seriesId)
    : mode === 'string'
      ? createStringSeriesConfig(state.subplots[state.subplots.length - 1]?.id || state.subplots[0]?.id)
      : createNumericSeriesConfig(undefined, undefined, state.subplots[state.subplots.length - 1]?.id || state.subplots[0]?.id);
  if (!sourceConfig) return;
  state.seriesEditor = {
    isOpen: true,
    targetId: seriesId,
    isNew: !seriesId,
    draft: cloneSeriesConfig(sourceConfig),
  };
  renderSeriesEditor();
  el.seriesModal.classList.remove('hidden');
  el.seriesModal.setAttribute('aria-hidden', 'false');
}

function saveSeriesEditor() {
  syncSeriesEditorDraftFromForm();
  const draft = state.seriesEditor.draft;
  if (!draft) return;
  if (state.seriesEditor.isNew) {
    state.seriesConfigs.push(cloneSeriesConfig(draft));
  } else {
    const target = state.seriesConfigs.find((item) => item.id === state.seriesEditor.targetId);
    if (target) Object.assign(target, cloneSeriesConfig(draft));
  }
  closeSeriesEditor();
  renderSeriesList();
  renderVisuals();
}

function parseMaybeNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getByPath(objectValue, path) {
  const tokens = [];
  const regex = /([^.[\]]+)|\[(\d+)\]/g;
  let match;
  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) tokens.push(match[1]);
    if (match[2] !== undefined) tokens.push(Number(match[2]));
  }
  let cursor = objectValue;
  for (const token of tokens) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = cursor[token];
  }
  return cursor;
}

function extractNumericFromText(text, config) {
  if (config.parserMode === 'regex') {
    try {
      const regex = new RegExp(config.pattern || '');
      const match = regex.exec(text);
      if (!match) return null;
      const groupIndex = Number(config.capture || '1');
      const raw = match[groupIndex] ?? match[0];
      return parseMaybeNumber(raw);
    } catch (error) {
      return null;
    }
  }

  if (config.parserMode === 'json') {
    try {
      const obj = JSON.parse(text);
      const raw = getByPath(obj, config.pattern || '');
      return parseMaybeNumber(raw);
    } catch (error) {
      return null;
    }
  }

  const key = (config.pattern || '').trim();
  if (!key) return null;
  const regex = new RegExp(`(?:^|[\\s,;|])${escapeRegExp(key)}\\s*[:=]\\s*([-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?)`);
  const match = regex.exec(text);
  return match ? Number(match[1]) : null;
}

function buildSeriesData(config) {
  const topic = getTopic(config.topic);
  if (!topic || topic.skipped) {
    return { label: getSeriesLabel(config), color: config.color, points: [], previewRows: [] };
  }

  if (config.type === 'numeric') {
    const series = topic.numeric_fields?.[config.field];
    if (!series) {
      return { label: getSeriesLabel(config), color: config.color, points: [], previewRows: [] };
    }
    const scale = Number(config.scale ?? 1) || 1;
    const points = series.t.map((t, index) => ({ t, v: series.v[index] * scale }));
    const values = points.map((point) => point.v);
    return {
      id: config.id,
      subplotId: config.subplotId,
      label: getSeriesLabel(config),
      color: config.color,
      points,
      previewRows: [],
      stats: {
        count: series.count,
        min: values.length ? Math.min(...values) : null,
        max: values.length ? Math.max(...values) : null,
      },
    };
  }

  const field = topic.string_fields?.[config.stringField];
  if (!field) {
    return { label: getSeriesLabel(config), color: config.color, points: [], previewRows: [] };
  }

  const scale = Number(config.scale ?? 1) || 1;
  const points = [];
  const previewRows = [];
  field.samples.forEach((sample) => {
    const value = extractNumericFromText(sample.text, config);
    if (value === null || value === undefined || Number.isNaN(value)) return;
    points.push({ t: sample.t, v: value * scale });
    if (previewRows.length < 20) {
      previewRows.push({
        label: getSeriesLabel(config),
        t: sample.t,
        text: sample.text,
        value: value * scale,
      });
    }
  });

  const values = points.map((item) => item.v);
  return {
    id: config.id,
    subplotId: config.subplotId,
    label: getSeriesLabel(config),
    color: config.color,
    points,
    previewRows,
    stats: {
      count: values.length,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    },
  };
}

function getRenderedSeries() {
  return state.seriesConfigs
    .map((config) => buildSeriesData(config))
    .filter((series) => series.points.length > 0);
}

function setupCanvas(canvas, desiredHeight) {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 800;
  const height = desiredHeight || rect.height || canvas.height || 360;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function drawEmptyCanvas(canvas, message) {
  const { ctx, width, height } = setupCanvas(canvas, canvas.height);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#4a5a7a';
  ctx.font = '15px "Segoe UI", sans-serif';
  ctx.fillText(message, 24, 36);
}

function drawTimeSeriesChart(canvas, seriesList, emptyMessage) {
  if (!seriesList.length) {
    drawEmptyCanvas(canvas, emptyMessage || '当前子图还没有曲线。');
    return;
  }

  const { ctx, width, height } = setupCanvas(canvas, 260);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 28, right: 28, bottom: 42, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allPoints = seriesList.flatMap((series) => series.points);
  const xMin = Math.min(...allPoints.map((point) => point.t));
  const xMax = Math.max(...allPoints.map((point) => point.t));
  let yMin = Math.min(...allPoints.map((point) => point.v));
  let yMax = Math.max(...allPoints.map((point) => point.v));
  if (yMax === yMin) {
    yMax += 1;
    yMin -= 1;
  }
  const yPad = (yMax - yMin) * 0.08;
  yMin -= yPad;
  yMax += yPad;

  const xScale = (value) => padding.left + ((value - xMin) / Math.max(xMax - xMin, 1e-6)) * plotWidth;
  const yScale = (value) => padding.top + (1 - (value - yMin) / Math.max(yMax - yMin, 1e-6)) * plotHeight;

  if (yMin <= 0 && yMax >= 0) {
    const zeroY = yScale(0);
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(padding.left + plotWidth, zeroY);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(148,163,184,0.16)';
  ctx.lineWidth = 1;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4a5a7a';

  const gridCount = 6;
  for (let i = 0; i <= gridCount; i += 1) {
    const ratio = i / gridCount;
    const x = padding.left + ratio * plotWidth;
    const y = padding.top + ratio * plotHeight;

    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();

    const tickTime = xMin + ratio * (xMax - xMin);
    const tickValue = yMax - ratio * (yMax - yMin);
    ctx.fillText(`${tickTime.toFixed(2)}s`, x - 18, height - 12);
    ctx.fillText(tickValue.toFixed(2), 10, y + 4);
  }

  ctx.strokeStyle = 'rgba(30,41,80,0.55)';
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.stroke();

  ctx.fillStyle = '#1a2744';
  ctx.font = '13px "Segoe UI", sans-serif';
  ctx.fillText('Time (s)', width - 86, height - 12);
  ctx.save();
  ctx.translate(18, 96);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Value', 0, 0);
  ctx.restore();

  seriesList.forEach((series) => {
    ctx.strokeStyle = series.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.points.forEach((point, index) => {
      const x = xScale(point.t);
      const y = yScale(point.v);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (series.points.length <= 1) {
      series.points.forEach((point) => {
        ctx.fillStyle = series.color;
        ctx.beginPath();
        ctx.arc(xScale(point.t), yScale(point.v), 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
}

function buildXYPoints(xSeries, ySeries) {
  if (!xSeries || !ySeries) return [];
  const source = xSeries.points.length >= ySeries.points.length ? xSeries : ySeries;
  const other = source === xSeries ? ySeries : xSeries;
  return source.points
    .map((point) => {
      const otherValue = sampleSeriesAt(other, point.t);
      if (otherValue === null) return null;
      return source === xSeries
        ? { x: point.v, y: otherValue, t: point.t }
        : { x: otherValue, y: point.v, t: point.t };
    })
    .filter(Boolean);
}


function normalizeAngleDeg(value) {
  let angle = Number(value) || 0;
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

function transformOdomSamplesToGlobal(samples) {
  if (!samples.length) return [];
  if (state.odomConfig.mode === 'identity') {
    return samples.map((sample) => ({ ...sample, gx: sample.x, gy: sample.y, gyaw_deg: sample.yaw_deg }));
  }

  if (state.odomConfig.mode === 'start_origin') {
    const start = samples[0];
    const dx0 = start.x;
    const dy0 = start.y;
    const yaw0 = (-start.yaw_deg * Math.PI) / 180;
    const cosA = Math.cos(yaw0);
    const sinA = Math.sin(yaw0);
    return samples.map((sample) => {
      const dx = sample.x - dx0;
      const dy = sample.y - dy0;
      return {
        ...sample,
        gx: cosA * dx - sinA * dy,
        gy: sinA * dx + cosA * dy,
        gyaw_deg: normalizeAngleDeg(sample.yaw_deg - start.yaw_deg),
      };
    });
  }

  const yawRad = (Number(state.odomConfig.yawDeg) * Math.PI) / 180;
  const cosA = Math.cos(yawRad);
  const sinA = Math.sin(yawRad);
  const tx = Number(state.odomConfig.tx);
  const ty = Number(state.odomConfig.ty);
  return samples.map((sample) => ({
    ...sample,
    gx: tx + cosA * sample.x - sinA * sample.y,
    gy: ty + sinA * sample.x + cosA * sample.y,
    gyaw_deg: normalizeAngleDeg(sample.yaw_deg + Number(state.odomConfig.yawDeg || 0)),
  }));
}

function sampleOdomPoseAt(samples, t) {
  if (!samples.length) return null;
  if (t <= samples[0].t) return samples[0];
  if (t >= samples[samples.length - 1].t) return samples[samples.length - 1];
  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const low = samples[lo];
  const high = samples[hi];
  const span = high.t - low.t;
  if (span <= 0) return low;
  const alpha = (t - low.t) / span;
  const deltaYaw = normalizeAngleDeg(high.gyaw_deg - low.gyaw_deg);
  return {
    t,
    gx: low.gx + alpha * (high.gx - low.gx),
    gy: low.gy + alpha * (high.gy - low.gy),
    gyaw_deg: normalizeAngleDeg(low.gyaw_deg + alpha * deltaYaw),
  };
}

function sampleTimedXYPointAt(points, t) {
  if (!points.length) return null;
  if (t <= points[0].t) return points[0];
  if (t >= points[points.length - 1].t) return points[points.length - 1];
  let lo = 0;
  let hi = points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const low = points[lo];
  const high = points[hi];
  const span = high.t - low.t;
  if (span <= 0) return low;
  const alpha = (t - low.t) / span;
  return {
    t,
    x: low.x + alpha * (high.x - low.x),
    y: low.y + alpha * (high.y - low.y),
  };
}

function drawHeadingArrow(ctx, x, y, yawDeg, { color = '#0f172a', lengthPx = 42 } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(yawDeg)) {
    return;
  }
  const yawRad = (yawDeg * Math.PI) / 180;
  const tipX = x + Math.cos(yawRad) * lengthPx;
  const tipY = y - Math.sin(yawRad) * lengthPx;
  const arrowHeadLength = Math.max(10, lengthPx * 0.26);
  const wingAngle = Math.PI / 7;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - arrowHeadLength * Math.cos(yawRad - wingAngle),
    tipY + arrowHeadLength * Math.sin(yawRad - wingAngle),
  );
  ctx.lineTo(
    tipX - arrowHeadLength * Math.cos(yawRad + wingAngle),
    tipY + arrowHeadLength * Math.sin(yawRad + wingAngle),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function transformXYPointsByOdom(xyPoints) {
  const topic = getTopic(state.odomConfig.topic);
  const samples = topic?.odom_track?.samples || [];
  if (!samples.length) return xyPoints;
  const globalSamples = transformOdomSamplesToGlobal(samples);
  return xyPoints.map((point) => {
    const pose = sampleOdomPoseAt(globalSamples, point.t);
    if (!pose) return point;
    const yawRad = (pose.gyaw_deg * Math.PI) / 180;
    const cosA = Math.cos(yawRad);
    const sinA = Math.sin(yawRad);
    return {
      ...point,
      x: pose.gx + cosA * point.x - sinA * point.y,
      y: pose.gy + sinA * point.x + cosA * point.y,
    };
  });
}


function compileAxisExpression(expression, fallbackVar) {
  const expr = String(expression || '').trim() || fallbackVar;
  try {
    return {
      fn: new Function(
        'x',
        'y',
        't',
        `const r=x, theta=y, distance=x, angle=y; const sin=Math.sin, cos=Math.cos, tan=Math.tan, abs=Math.abs, sqrt=Math.sqrt, pow=Math.pow, PI=Math.PI; return (${expr});`,
      ),
      error: '',
    };
  } catch (error) {
    return { fn: null, error: error.message || '表达式解析失败' };
  }
}

function updateOdomLocalStatus(message = '', isError = false) {
  if (!el.odomLocalStatus) return;
  let text = message;
  const mode = normalizeLocalCoordinateMode(state.odomConfig.localCoordinateMode);
  const meta = getOdomLocalModeMeta(mode);
  if (!text) {
    const sourceCount = getGlobalNumericFieldSources().length;
    if (!state.manifest) {
      text = '加载数据集后可配置局部 XY 到全局坐标转换。';
    } else if (!sourceCount) {
      text = '当前没有可用的数值字段，无法生成局部 XY。';
    } else if (!state.odomConfig.localXSourceKey || !state.odomConfig.localYSourceKey) {
      text = mode === 'polar'
        ? '请选择距离字段和方位角字段，再生成局部 XY。'
        : '请选择局部 X / Y 字段，再设置表达式。';
    } else {
      text = meta.statusHint;
    }
  }
  el.odomLocalStatus.textContent = text;
  el.odomLocalStatus.classList.toggle('is-error', !!isError);
}


function buildOdomLocalPreviewPoints() {
  const xSeries = buildSeriesDataFromSource(state.odomConfig.localXSourceKey);
  const ySeries = buildSeriesDataFromSource(state.odomConfig.localYSourceKey);
  if (!xSeries || !ySeries) return [];
  const modeDefaults = getLocalCoordinateModeDefaults(normalizeLocalCoordinateMode(state.odomConfig.localCoordinateMode));
  const xCompiled = compileAxisExpression(state.odomConfig.localXExpr, modeDefaults.xExpr);
  const yCompiled = compileAxisExpression(state.odomConfig.localYExpr, modeDefaults.yExpr);
  if (!xCompiled.fn || !yCompiled.fn) {
    updateOdomLocalStatus(`表达式错误：${xCompiled.error || yCompiled.error}`, true);
    return [];
  }
  const localPoints = buildXYPoints(xSeries, ySeries)
    .map((point) => {
      try {
        const x = Number(xCompiled.fn(point.x, point.y, point.t));
        const y = Number(yCompiled.fn(point.x, point.y, point.t));
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { ...point, x, y };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
  updateOdomLocalStatus(localPoints.length ? `局部预览：${localPoints.length} 点，x=[${fmtNumber(Math.min(...localPoints.map((p) => p.x)), 2)}, ${fmtNumber(Math.max(...localPoints.map((p) => p.x)), 2)}]，y=[${fmtNumber(Math.min(...localPoints.map((p) => p.y)), 2)}, ${fmtNumber(Math.max(...localPoints.map((p) => p.y)), 2)}]` : '表达式有效，但当前没有可转换的局部点。', false);
  return localPoints;
}

function drawOdomLocalPreview() {
  if (!el.odomLocalPreviewCanvas) return;
  const localPoints = buildOdomLocalPreviewPoints();
  if (!localPoints.length) {
    drawEmptyCanvas(el.odomLocalPreviewCanvas, '当前没有可预览的局部 XY');
    return;
  }
  const seriesX = { label: '局部 X', color: '#f59e0b', points: localPoints.map((point) => ({ t: point.t, v: point.x })) };
  const seriesY = { label: '局部 Y', color: '#06b6d4', points: localPoints.map((point) => ({ t: point.t, v: point.y })) };
  drawXYChart(el.odomLocalPreviewCanvas, seriesX, seriesY, '当前没有可预览的局部 XY');
}

function getOdomLocalOverlayPoints() {
  if (!state.odomConfig.localXYEnabled) return [];
  const localPoints = buildOdomLocalPreviewPoints();
  if (!localPoints.length) return [];
  return transformXYPointsByOdom(localPoints);
}

function drawXYChart(canvas, xSeries, ySeries, emptyMessage, options = {}) {
  const rawPoints = buildXYPoints(xSeries, ySeries);
  const xyPoints = options.useOdomTransform ? transformXYPointsByOdom(rawPoints) : rawPoints;
  if (!xyPoints.length) {
    drawEmptyCanvas(canvas, emptyMessage || 'XY 子图没有可配对的数据点。');
    return;
  }

  const { ctx, width, height } = setupCanvas(canvas, 260);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: options.useOdomTransform ? 58 : 42, right: 18, bottom: 40, left: 76 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  let xMin = Math.min(...xyPoints.map((point) => point.x));
  let xMax = Math.max(...xyPoints.map((point) => point.x));
  let yMin = Math.min(...xyPoints.map((point) => point.y));
  let yMax = Math.max(...xyPoints.map((point) => point.y));
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const xPad = (xMax - xMin) * 0.08;
  const yPad = (yMax - yMin) * 0.08;
  xMin -= xPad; xMax += xPad;
  yMin -= yPad; yMax += yPad;

  const xScale = (value) => padding.left + ((value - xMin) / Math.max(xMax - xMin, 1e-6)) * plotWidth;
  const yScale = (value) => padding.top + (1 - (value - yMin) / Math.max(yMax - yMin, 1e-6)) * plotHeight;

  ctx.fillStyle = '#1a2744';
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillText(`X: ${compactSeriesLabel(xSeries.label)}`, padding.left, 18);
  ctx.fillText(`Y: ${compactSeriesLabel(ySeries.label)}`, padding.left, 34);
  if (options.useOdomTransform) ctx.fillText('坐标: 通过 Odom 转全局', padding.left, 50);

  ctx.strokeStyle = 'rgba(148,163,184,0.16)';
  ctx.lineWidth = 1;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4a5a7a';
  for (let i = 0; i <= 6; i += 1) {
    const ratio = i / 6;
    const x = padding.left + ratio * plotWidth;
    const y = padding.top + ratio * plotHeight;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
    ctx.fillText((xMin + ratio * (xMax - xMin)).toFixed(2), x - 16, height - 12);
    ctx.fillText((yMax - ratio * (yMax - yMin)).toFixed(2), 8, y + 4);
  }

  if (xMin <= 0 && xMax >= 0) {
    const zeroX = xScale(0);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.58)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(zeroX, padding.top);
    ctx.lineTo(zeroX, padding.top + plotHeight);
    ctx.stroke();
    ctx.restore();
  }
  if (yMin <= 0 && yMax >= 0) {
    const zeroY = yScale(0);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.58)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(padding.left + plotWidth, zeroY);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(30,41,80,0.55)';
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.stroke();

  ctx.strokeStyle = xSeries.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  xyPoints.forEach((point, index) => {
    const x = xScale(point.x);
    const y = yScale(point.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  xyPoints.forEach((point, index) => {
    if (index % Math.max(1, Math.floor(xyPoints.length / 48)) !== 0 && index !== xyPoints.length - 1) return;
    ctx.fillStyle = xSeries.color;
    ctx.beginPath();
    ctx.arc(xScale(point.x), yScale(point.y), 2.6, 0, Math.PI * 2);
    ctx.fill();
  });

  const startPoint = xyPoints[0];
  const endPoint = xyPoints[xyPoints.length - 1];
  const arrowSource = xyPoints[Math.max(0, xyPoints.length - 2)];
  const arrowTarget = endPoint;
  const dx = xScale(arrowTarget.x) - xScale(arrowSource.x);
  const dy = yScale(arrowTarget.y) - yScale(arrowSource.y);
  const arrowAngle = Math.atan2(dy, dx);

  ctx.strokeStyle = '#dc2626';
  ctx.fillStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xScale(arrowSource.x), yScale(arrowSource.y));
  ctx.lineTo(xScale(arrowTarget.x), yScale(arrowTarget.y));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(xScale(arrowTarget.x), yScale(arrowTarget.y));
  ctx.lineTo(
    xScale(arrowTarget.x) - 9 * Math.cos(arrowAngle - Math.PI / 6),
    yScale(arrowTarget.y) - 9 * Math.sin(arrowAngle - Math.PI / 6),
  );
  ctx.lineTo(
    xScale(arrowTarget.x) - 9 * Math.cos(arrowAngle + Math.PI / 6),
    yScale(arrowTarget.y) - 9 * Math.sin(arrowAngle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.arc(xScale(startPoint.x), yScale(startPoint.y), 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText('S', xScale(startPoint.x) - 3, yScale(startPoint.y) + 3);

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(xScale(endPoint.x), yScale(endPoint.y), 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText('E', xScale(endPoint.x) - 3, yScale(endPoint.y) + 3);

  const currentPoint = xyPoints.reduce((best, point) => (
    Math.abs(point.t - state.cursor.t) < Math.abs(best.t - state.cursor.t) ? point : best
  ), xyPoints[0]);
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(xScale(currentPoint.x), yScale(currentPoint.y), 4.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a5a7a';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText('绿=S  红=E  黑=当前', padding.left, height - 22);
}


function drawMultiXYChart(canvas, groups, emptyMessage) {
  const readyGroups = groups
    .map((group) => ({ ...group, points: buildXYPoints(group.xSeries, group.ySeries) }))
    .filter((group) => group.points.length > 0);
  if (!readyGroups.length) {
    drawEmptyCanvas(canvas, emptyMessage || '当前还没有可绘制的 XY 坐标组。');
    return;
  }

  const { ctx, width, height } = setupCanvas(canvas, 300);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 24, right: 18, bottom: 40, left: 76 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const allPoints = readyGroups.flatMap((group) => group.points);

  let xMin = Math.min(...allPoints.map((point) => point.x));
  let xMax = Math.max(...allPoints.map((point) => point.x));
  let yMin = Math.min(...allPoints.map((point) => point.y));
  let yMax = Math.max(...allPoints.map((point) => point.y));
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const xPad = (xMax - xMin) * 0.08;
  const yPad = (yMax - yMin) * 0.08;
  xMin -= xPad; xMax += xPad;
  yMin -= yPad; yMax += yPad;

  const xScale = (value) => padding.left + ((value - xMin) / Math.max(xMax - xMin, 1e-6)) * plotWidth;
  const yScale = (value) => padding.top + (1 - (value - yMin) / Math.max(yMax - yMin, 1e-6)) * plotHeight;

  ctx.strokeStyle = 'rgba(148,163,184,0.16)';
  ctx.lineWidth = 1;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4a5a7a';
  for (let i = 0; i <= 6; i += 1) {
    const ratio = i / 6;
    const x = padding.left + ratio * plotWidth;
    const y = padding.top + ratio * plotHeight;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
    ctx.fillText((xMin + ratio * (xMax - xMin)).toFixed(2), x - 16, height - 12);
    ctx.fillText((yMax - ratio * (yMax - yMin)).toFixed(2), 8, y + 4);
  }

  if (xMin <= 0 && xMax >= 0) {
    const zeroX = xScale(0);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.58)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(zeroX, padding.top);
    ctx.lineTo(zeroX, padding.top + plotHeight);
    ctx.stroke();
    ctx.restore();
  }
  if (yMin <= 0 && yMax >= 0) {
    const zeroY = yScale(0);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.58)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(padding.left + plotWidth, zeroY);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(30,41,80,0.55)';
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.stroke();

  readyGroups.forEach((group) => {
    ctx.strokeStyle = group.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    group.points.forEach((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const startPoint = group.points[0];
    const endPoint = group.points[group.points.length - 1];
    const arrowSource = group.points[Math.max(0, group.points.length - 2)];
    const arrowTarget = endPoint;
    const dx = xScale(arrowTarget.x) - xScale(arrowSource.x);
    const dy = yScale(arrowTarget.y) - yScale(arrowSource.y);
    const arrowAngle = Math.atan2(dy, dx);

    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(xScale(arrowSource.x), yScale(arrowSource.y));
    ctx.lineTo(xScale(arrowTarget.x), yScale(arrowTarget.y));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xScale(arrowTarget.x), yScale(arrowTarget.y));
    ctx.lineTo(
      xScale(arrowTarget.x) - 8 * Math.cos(arrowAngle - Math.PI / 6),
      yScale(arrowTarget.y) - 8 * Math.sin(arrowAngle - Math.PI / 6),
    );
    ctx.lineTo(
      xScale(arrowTarget.x) - 8 * Math.cos(arrowAngle + Math.PI / 6),
      yScale(arrowTarget.y) - 8 * Math.sin(arrowAngle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(xScale(startPoint.x), yScale(startPoint.y), 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(xScale(endPoint.x), yScale(endPoint.y), 3.8, 0, Math.PI * 2);
    ctx.fill();

    const currentPoint = group.points.reduce((best, point) => (
      Math.abs(point.t - state.cursor.t) < Math.abs(best.t - state.cursor.t) ? point : best
    ), group.points[0]);
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(xScale(currentPoint.x), yScale(currentPoint.y), 3.8, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#4a5a7a';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText('绿=S  红=E  黑=当前', padding.left, height - 22);
}

function renderSeriesStats(seriesList, targetEl) {
  targetEl.innerHTML = '';
  if (!seriesList.length) return;
  seriesList.forEach((series) => {
    const pill = document.createElement('div');
    pill.className = 'inline-pill';
    pill.innerHTML = `
      <span class="series-dot" style="background:${escapeHtml(series.color)}"></span>
      <strong>${escapeHtml(series.label)}</strong>
      <span class="muted-text">n=${escapeHtml(String(series.stats?.count || series.points.length))}</span>
      <span class="muted-text">min=${escapeHtml(fmtNumber(series.stats?.min, 3))}</span>
      <span class="muted-text">max=${escapeHtml(fmtNumber(series.stats?.max, 3))}</span>
    `;
    targetEl.appendChild(pill);
  });
}

function renderSubplotCards(targetEl, subplotEntries, seriesList) {
  if (!targetEl) return;
  targetEl.innerHTML = '';
  const orderedSubplots = [...subplotEntries].sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
  orderedSubplots.forEach((subplot) => {
    normalizeSubplotConfig(subplot, seriesList);
    const seriesOptions = getGlobalNumericFieldOptionList(subplot.xSeriesId);
    const ySeriesOptions = getGlobalNumericFieldOptionList(subplot.ySeriesId);
    const wrapper = document.createElement('section');
    wrapper.className = 'subplot-card';
    wrapper.innerHTML = `
      <div class="subplot-header compact-subplot-header">
        <div>
          <strong>${escapeHtml(subplot.title)}</strong>
          <p>${seriesList.length >= 2 ? '可从全局数值字段中直接指定 X / Y 坐标。' : '至少需要 2 个全局数值字段，才能指定 X / Y 坐标。'}</p>
        </div>
        ${state.subplots.length > 1 ? '<button type="button" class="ghost-btn small-btn" data-action="delete-subplot">删除坐标组</button>' : ''}
      </div>
      <div class="subplot-xy-toolbar">
        <label class="compact-field">
          <span>X 坐标字段</span>
          <select data-action="subplot-x">${seriesOptions}</select>
        </label>
        <label class="compact-field">
          <span>Y 坐标字段</span>
          <select data-action="subplot-y">${ySeriesOptions}</select>
        </label>
        <label class="compact-field full-width subplot-transform-toggle">
          <span>坐标变换</span>
          <select data-action="subplot-transform">
            <option value="local" ${subplot.useOdomTransform ? '' : 'selected'}>保持局部 XY</option>
            <option value="odom_global" ${subplot.useOdomTransform ? 'selected' : ''}>通过 Odom 转全局</option>
          </select>
        </label>
      </div>
      <canvas class="chart-canvas subplot-canvas" height="260"></canvas>
      <div class="stats-inline"></div>
    `;
    targetEl.appendChild(wrapper);

    const canvas = wrapper.querySelector('canvas');
    const xSeries = buildSeriesDataFromSource(subplot.xSeriesId);
    const ySeries = buildSeriesDataFromSource(subplot.ySeriesId);
    if (xSeries) xSeries.color = '#5ba2ff';
    if (ySeries) ySeries.color = '#fb7185';
    drawXYChart(canvas, xSeries, ySeries, `${subplot.title} 需要 2 条全局字段才能绘制 XY`, { useOdomTransform: subplot.useOdomTransform });
    renderSeriesStats([xSeries, ySeries].filter(Boolean), wrapper.querySelector('.stats-inline'));

    wrapper.querySelector('[data-action="delete-subplot"]')?.addEventListener('click', () => {
      state.subplots = state.subplots.filter((item) => item.id !== subplot.id);
      renderSeriesList();
      renderVisuals();
    });
    wrapper.querySelector('[data-action="subplot-x"]')?.addEventListener('change', (event) => {
      subplot.xSeriesId = event.target.value;
      normalizeSubplotConfig(subplot, seriesList);
      renderPlotPanels(getRenderedSeries());
    });
    wrapper.querySelector('[data-action="subplot-y"]')?.addEventListener('change', (event) => {
      subplot.ySeriesId = event.target.value;
      normalizeSubplotConfig(subplot, seriesList);
      renderPlotPanels(getRenderedSeries());
    });
    wrapper.querySelector('[data-action="subplot-transform"]')?.addEventListener('change', (event) => {
      subplot.useOdomTransform = event.target.value === 'odom_global';
      renderPlotPanels(getRenderedSeries());
    });
  });
}

function renderPlotPanels(seriesList) {
  el.plotPanels.innerHTML = '';
  if (!state.subplots.length) {
    el.plotPanels.innerHTML = '<div class="empty-xy-state">当前没有 XY 坐标组，点击“添加坐标组”即可开始配置。</div>';
    return;
  }
  state.subplots.forEach((subplot) => normalizeSubplotConfig(subplot, seriesList));
  renderSubplotCards(el.plotPanels, state.subplots, seriesList);
}


function getImageTopics(includeEmpty = true) {
  return getTopics().filter((topic) => {
    if (!topic.image_stream) return false;
    return includeEmpty ? true : (topic.image_stream.frames || []).length > 0;
  });
}

function getFramesForTopic(topicName) {
  const topic = getTopic(topicName);
  return topic?.image_stream?.frames || [];
}

function getPrimaryImageFrames() {
  const primaryTopic = state.imageViewer.panels[0];
  return getFramesForTopic(primaryTopic);
}

function renderBagTopicSummary() {
  if (!el.bagTopicSummary || !el.bagTopicList || !el.bagTopicCount) return;
  const topics = getTopics();
  if (!topics.length) {
    el.bagTopicSummary.classList.add('hidden');
    el.bagTopicCount.textContent = '';
    el.bagTopicList.innerHTML = '';
    return;
  }
  el.bagTopicSummary.classList.remove('hidden');
  const imageCount = getImageTopics(true).length;
  const numericCount = getNumericTopics().length;
  const odomCount = getOdomTopics().length;
  el.bagTopicCount.textContent = `${topics.length} 个 topic · 图像 ${imageCount} · 数值 ${numericCount} · Odom ${odomCount}`;
  el.bagTopicList.innerHTML = topics.map((topic) => {
    const detail = topic.image_stream
      ? `${topic.image_stream.count || (topic.image_stream.frames || []).length} 帧`
      : topic.odom_track
        ? `${topic.odom_track.count || 0} 点`
        : `${topic.count || 0} 条`;
    const kind = topic.image_stream ? '图像' : topic.odom_track ? 'Odom' : topic.skipped ? '跳过' : '数据';
    return `<span class="meta-pill" title="${escapeHtml(topic.type || '')}">${escapeHtml(topic.name)} · ${escapeHtml(kind)} · ${escapeHtml(detail)}</span>`;
  }).join('');
}

function findNearestFrameIndex(frames, t) {
  if (!frames.length) return -1;
  if (t <= frames[0].t) return 0;
  if (t >= frames[frames.length - 1].t) return frames.length - 1;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (frames[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  if (lo + 1 < frames.length && frames[lo + 1].t - t < t - frames[lo].t) return lo + 1;
  return lo;
}

function hexToRgbTriple(hex) {
  const match = /^#?([a-f0-9]{6})$/i.exec(String(hex || ''));
  if (!match) return '91, 162, 255';
  const r = parseInt(match[1].slice(0, 2), 16);
  const g = parseInt(match[1].slice(2, 4), 16);
  const b = parseInt(match[1].slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function darkenHex(hex, amount = 0.3) {
  const match = /^#?([a-f0-9]{6})$/i.exec(String(hex || ''));
  if (!match) return hex;
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(match[1].slice(offset, offset + 2), 16);
    return Math.max(0, Math.min(255, Math.round(value * (1 - amount))));
  });
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function applyTheme() {
  const { accent, bottomTint, bottomGlow, panelLift } = state.theme;
  const root = document.documentElement.style;
  root.setProperty('--accent', accent);
  root.setProperty('--accent-2', darkenHex(accent, 0.32));
  root.setProperty('--accent-rgb', hexToRgbTriple(accent));
  root.setProperty('--bottom-tint-rgb', hexToRgbTriple(bottomTint));
  const glow = Math.min(100, Math.max(0, Number(bottomGlow)));
  root.setProperty('--bottom-glow-alpha', (glow / 100).toFixed(3));
  const lift = Math.min(100, Math.max(0, Number(panelLift))) / 100;
  root.setProperty('--panel-alpha', (0.72 + lift * 0.25).toFixed(3));
  root.setProperty('--panel-alpha-2', (0.66 + lift * 0.28).toFixed(3));
}

function saveTheme() {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state.theme));
  } catch (error) {
    // storage unavailable — safe to ignore
  }
}

function loadTheme() {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.theme = { ...THEME_DEFAULTS, ...(parsed || {}) };
  } catch (error) {
    state.theme = { ...THEME_DEFAULTS };
  }
}

function syncThemeControls() {
  if (el.accentColorInput) el.accentColorInput.value = state.theme.accent;
  if (el.bottomTintInput) el.bottomTintInput.value = state.theme.bottomTint;
  if (el.bottomGlowInput) el.bottomGlowInput.value = String(state.theme.bottomGlow);
  if (el.panelLiftInput) el.panelLiftInput.value = String(state.theme.panelLift);
}

function clampCursor(t) {
  if (!Number.isFinite(t)) return state.cursor.tMin;
  return Math.min(state.cursor.tMax, Math.max(state.cursor.tMin, t));
}

function isEditableEventTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

function stepCursorByKeyboard(direction, options = {}) {
  const span = Math.max(state.cursor.tMax - state.cursor.tMin, 0);
  if (!(span > 0)) return false;
  const multiplier = options.fast ? 10 : 1;
  const delta = (span / CURSOR_SLIDER_STEPS) * multiplier;
  if (!(delta > 0)) return false;
  setCursor(state.cursor.t + delta * direction);
  return true;
}

function syncCursorSlider() {
  if (!el.cursorSlider) return;
  const span = Math.max(state.cursor.tMax - state.cursor.tMin, 1e-6);
  const ratio = (state.cursor.t - state.cursor.tMin) / span;
  el.cursorSlider.value = String(Math.round(ratio * CURSOR_SLIDER_STEPS));
}

function sampleSeriesAt(series, t) {
  const points = series.points;
  if (!points.length) return null;
  if (t <= points[0].t) return points[0].v;
  if (t >= points[points.length - 1].t) return points[points.length - 1].v;
  let lo = 0;
  let hi = points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const low = points[lo];
  const high = points[hi];
  const span = high.t - low.t;
  if (span <= 0) return low.v;
  const alpha = (t - low.t) / span;
  return low.v + alpha * (high.v - low.v);
}

function updateCursorMeta() {
  if (el.cursorMeta) {
    const absoluteTime = fmtAbsoluteSecFromOrigin(state.cursor.t);
    el.cursorMeta.innerHTML = `
      <span class="inline-pill">时间 ${escapeHtml(fmtNumber(state.cursor.t, 3))} s</span>
      ${absoluteTime ? `<span class="inline-pill">${escapeHtml(absoluteTime)}</span>` : ''}
      <span class="inline-pill">范围 ${escapeHtml(fmtNumber(state.cursor.tMin, 2))}–${escapeHtml(fmtNumber(state.cursor.tMax, 2))} s</span>
    `;
  }
  if (!el.cursorSamples) return;
  const seriesList = getRenderedSeries();
  if (!seriesList.length) {
    el.cursorSamples.innerHTML = '<div class="muted-text">没有可供采样的曲线。</div>';
    return;
  }
  el.cursorSamples.innerHTML = seriesList.map((series) => {
    const value = sampleSeriesAt(series, state.cursor.t);
    return `
      <article class="cursor-sample">
        <span class="series-dot" style="background:${escapeHtml(series.color)}"></span>
        <strong style="color:${escapeHtml(series.color)}">${escapeHtml(series.label)}</strong>
        <span class="mono">${value === null ? '—' : escapeHtml(fmtNumber(value, 4))}</span>
      </article>
    `;
  }).join('');
}

function setCursor(t, options = {}) {
  state.cursor.t = clampCursor(t);
  syncCursorSlider();
  if (options.silent) return;
  renderTimeline();
  renderImageViewer();
  renderPlotPanels(getRenderedSeries());
  drawTrajectory();
  updateCursorMeta();
}

function renderTimeline() {
  if (!el.timelineCanvas) return;
  const seriesList = getRenderedSeries();
  const { ctx, width, height } = setupCanvas(el.timelineCanvas, 170);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 14, right: 18, bottom: 26, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xMin = state.cursor.tMin;
  const xMax = state.cursor.tMax;
  const xScale = (t) => padding.left + ((t - xMin) / Math.max(xMax - xMin, 1e-6)) * plotWidth;

  ctx.strokeStyle = 'rgba(148,163,184,0.18)';
  ctx.fillStyle = '#4a5a7a';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const majorLeft = padding.left + (plotWidth / 5) * i;
    const step = plotWidth / 5;
    for (let j = 1; j <= 3; j += 1) {
      const minorX = majorLeft + (step / 4) * j;
      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.beginPath();
      ctx.moveTo(minorX, padding.top);
      ctx.lineTo(minorX, padding.top + plotHeight);
      ctx.stroke();
    }
  }
  for (let i = 0; i <= 5; i += 1) {
    const x = padding.left + (plotWidth / 5) * i;
    ctx.strokeStyle = 'rgba(148,163,184,0.22)';
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
    ctx.fillText(`${(xMin + (i / 5) * (xMax - xMin)).toFixed(1)}s`, x - 14, height - 8);
  }

  if (seriesList.length) {
    const allPoints = seriesList.flatMap((series) => series.points);
    let yMin = Math.min(...allPoints.map((point) => point.v));
    let yMax = Math.max(...allPoints.map((point) => point.v));
    if (yMax === yMin) {
      yMax += 1;
      yMin -= 1;
    }
    const yPad = (yMax - yMin) * 0.08;
    yMin -= yPad;
    yMax += yPad;
    const yScale = (value) => padding.top + (1 - (value - yMin) / Math.max(yMax - yMin, 1e-6)) * plotHeight;

    if (yMin <= 0 && yMax >= 0) {
      const zeroY = yScale(0);
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.fillRect(padding.left, Math.max(padding.top, zeroY - 4), plotWidth, 8);
      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.82)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(width - padding.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.96)';
      ctx.fillRect(padding.left + 4, zeroY - 11, 22, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('0线', padding.left + 8, zeroY + 1);
      ctx.restore();
    }

    const sampledPoints = [];
    seriesList.forEach((series) => {
      const currentValue = sampleSeriesAt(series, state.cursor.t);
      const currentY = currentValue === null ? null : yScale(currentValue);
      ctx.globalAlpha = 0.82;
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      series.points.forEach((point, index) => {
        const x = xScale(point.t);
        const y = yScale(point.v);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (currentY !== null) sampledPoints.push({ series, y: currentY, value: currentValue });
    });

    const cursorX = xScale(state.cursor.t);
    sampledPoints.forEach(({ series, y, value }) => {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = `${series.color}55`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = series.color;
      ctx.beginPath();
      ctx.arc(cursorX, y, 3.2, 0, Math.PI * 2);
      ctx.fill();

      const label = fmtNumber(value, 3);
      ctx.font = '10px "JetBrains Mono", monospace';
      const labelWidth = ctx.measureText(label).width + 12;
      const labelX = Math.min(width - padding.right - labelWidth, cursorX + 8);
      const labelY = Math.max(padding.top + 12, Math.min(padding.top + plotHeight - 6, y - 8));
      ctx.fillStyle = series.color;
      ctx.fillRect(labelX, labelY - 10, labelWidth, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, labelX + 6, labelY + 2);
    });
  } else {
    ctx.fillStyle = '#4a5a7a';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('还没有可联动的曲线', padding.left, padding.top + plotHeight / 2);
  }

  const frames = getPrimaryImageFrames();
  if (frames.length) {
    ctx.fillStyle = 'rgba(30,41,80,0.55)';
    for (const frame of frames) {
      const x = xScale(frame.t);
      ctx.fillRect(x, height - padding.bottom + 2, 1, 4);
    }
  }

  const cursorX = xScale(state.cursor.t);
  ctx.strokeStyle = 'rgba(30,41,80,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cursorX, padding.top);
  ctx.lineTo(cursorX, padding.top + plotHeight);
  ctx.stroke();
  ctx.fillStyle = 'rgba(30,41,80,0.9)';
  ctx.beginPath();
  ctx.arc(cursorX, padding.top, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,41,80,0.78)';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText(`${state.cursor.t.toFixed(2)}s`, Math.min(cursorX + 6, width - padding.right - 36), padding.top + 11);
}

// ── Fullscreen Image Viewer ────────────────────────────────────
function getFullscreenInfo() {
  const { fullscreenPanelIdx, fullscreenFrameIdx } = state.imageViewer;
  if (!Number.isInteger(fullscreenPanelIdx) || !Number.isInteger(fullscreenFrameIdx)) return null;
  const topicName = state.imageViewer.panels[fullscreenPanelIdx];
  if (!topicName) return null;
  const frames = getFramesForTopic(topicName);
  return { topicName, frames, frameIdx: fullscreenFrameIdx };
}

function openFullscreen(panelIdx, frameIdx) {
  state.imageViewer.fullscreenPanelIdx = panelIdx;
  state.imageViewer.fullscreenFrameIdx = frameIdx;
  if (el.fullscreenOverlay) el.fullscreenOverlay.classList.remove('hidden');
  syncFullscreenFrame();
  document.body.style.overflow = 'hidden';
}

function closeFullscreen() {
  state.imageViewer.fullscreenPanelIdx = -1;
  state.imageViewer.fullscreenFrameIdx = -1;
  if (el.fullscreenOverlay) el.fullscreenOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function syncFullscreenFrame() {
  const info = getFullscreenInfo();
  if (!info) { closeFullscreen(); return; }
  const { topicName, frames, frameIdx } = info;
  const frame = frames[frameIdx];
  if (!frame) return;
  const src = resolveFrameSrc(frame);
  syncImageElementSource(el.fullscreenImg, src);
  const total = frames.length;
  if (el.fullscreenMeta) {
    el.fullscreenMeta.innerHTML =
      `<span>${escapeHtml(topicName)}</span>` +
      `<span>帧 ${frameIdx + 1} / ${total}</span>` +
      `<span>${escapeHtml(fmtSec(frame.t))}</span>` +
      `<span>${frame.width || '?'}×${frame.height || '?'}</span>`;
  }
  if (el.fullscreenPrev) el.fullscreenPrev.disabled = frameIdx <= 0;
  if (el.fullscreenNext) el.fullscreenNext.disabled = frameIdx >= total - 1;
}

function fullscreenStep(dir) {
  const info = getFullscreenInfo();
  if (!info) return;
  const { frames, frameIdx } = info;
  const next = frameIdx + dir;
  if (next < 0 || next >= frames.length) return;
  state.imageViewer.fullscreenFrameIdx = next;
  syncFullscreenFrame();
}

const MAX_IMAGE_PANELS = 6;

function resolveFrameSrc(frame, { preferPreview = false } = {}) {
  if (!frame) return '';
  const relativePath = preferPreview ? (frame.preview_file || frame.file) : frame.file;
  if (!relativePath || !state.activeDatasetBaseUrl) return '';
  return new URL(relativePath, state.activeDatasetBaseUrl).href;
}

function syncImageElementSource(imgEl, nextSrc) {
  if (!imgEl || !nextSrc) return;
  if (imgEl.dataset.displayedSrc === nextSrc || imgEl.dataset.pendingSrc === nextSrc) return;

  const requestToken = String((Number(imgEl.dataset.requestToken) || 0) + 1);
  imgEl.dataset.requestToken = requestToken;
  imgEl.dataset.pendingSrc = nextSrc;

  const loader = new Image();
  loader.decoding = 'async';

  let settled = false;
  const commit = () => {
    if (settled) return;
    settled = true;
    if (imgEl.dataset.requestToken !== requestToken) return;
    imgEl.src = nextSrc;
    imgEl.dataset.displayedSrc = nextSrc;
    imgEl.dataset.pendingSrc = '';
  };

  const resetPending = () => {
    if (settled) return;
    settled = true;
    if (imgEl.dataset.requestToken === requestToken && imgEl.dataset.pendingSrc === nextSrc) {
      imgEl.dataset.pendingSrc = '';
    }
  };

  loader.addEventListener('load', commit, { once: true });
  loader.addEventListener('error', resetPending, { once: true });
  loader.src = nextSrc;

  if (loader.complete) {
    queueMicrotask(commit);
  }
}

function getImageGridSignature(imageTopics, canRemove) {
  const topicSignature = imageTopics
    .map((topic) => `${topic.name}:${topic.image_stream?.count || (topic.image_stream?.frames || []).length}`)
    .join('|');
  return JSON.stringify({
    panels: state.imageViewer.panels,
    topicSignature,
    canRemove,
  });
}

function syncImagePanels() {
  const imageTopics = getImageTopics(true);
  const available = new Set(imageTopics.map((topic) => topic.name));
  state.imageViewer.panels = state.imageViewer.panels.filter((name) => available.has(name));
  if (!state.imageViewer.panels.length && imageTopics.length) {
    const firstReady = getImageTopics(false)[0] || imageTopics[0];
    state.imageViewer.panels.push(firstReady.name);
  }
}

function buildImageTileHtml(panelIdx, topicName, canRemove) {
  const imageTopics = getImageTopics(true);
  const options = imageTopics.length
    ? imageTopics.map((topic) => {
        const label = `${topic.name} · ${topic.image_stream.count || (topic.image_stream.frames || []).length} 帧`;
        const selected = topic.name === topicName ? 'selected' : '';
        return `<option value="${escapeHtml(topic.name)}" ${selected}>${escapeHtml(label)}</option>`;
      }).join('')
    : '<option value="">（无图像 topic）</option>';

  const frames = getFramesForTopic(topicName);
  if (!frames.length) {
    return `
      <div class="cam-tile" data-panel-idx="${panelIdx}">
        <div class="cam-tile-head">
          <select class="cam-topic-select" data-panel-idx="${panelIdx}">${options}</select>
          ${canRemove ? `<button type="button" class="cam-remove-btn ghost-btn small-btn" data-panel-idx="${panelIdx}" title="移除该相机">×</button>` : ''}
        </div>
        <div class="cam-tile-stage cam-tile-stage-empty">
          <img class="cam-frame-img hidden" data-panel-idx="${panelIdx}" data-frame-idx="" alt="camera ${panelIdx}" />
          <span class="cam-tile-empty muted-text">此 topic 无帧数据</span>
          <div class="meta-list image-meta-overlay hidden">
            <span class="meta-pill cam-meta-index"></span>
            <span class="meta-pill cam-meta-relative"></span>
            <span class="meta-pill cam-meta-absolute hidden"></span>
            <span class="meta-pill cam-meta-size"></span>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="cam-tile" data-panel-idx="${panelIdx}">
      <div class="cam-tile-head">
        <select class="cam-topic-select" data-panel-idx="${panelIdx}">${options}</select>
        ${canRemove ? `<button type="button" class="cam-remove-btn ghost-btn small-btn" data-panel-idx="${panelIdx}" title="移除该相机">×</button>` : ''}
      </div>
      <div class="cam-tile-stage">
        <img class="cam-frame-img hidden" data-panel-idx="${panelIdx}" data-frame-idx="" alt="camera ${panelIdx}" />
        <span class="cam-tile-empty muted-text hidden">此 topic 无帧数据</span>
        <div class="meta-list image-meta-overlay hidden">
          <span class="meta-pill cam-meta-index"></span>
          <span class="meta-pill cam-meta-relative"></span>
          <span class="meta-pill cam-meta-absolute hidden"></span>
          <span class="meta-pill cam-meta-size"></span>
        </div>
      </div>
    </div>`;
}

function bindImageGridEvents() {
  el.imageGrid.querySelectorAll('.cam-topic-select').forEach((select) => {
    select.addEventListener('change', () => {
      const panelIdx = Number(select.dataset.panelIdx);
      if (Number.isInteger(panelIdx)) {
        state.imageViewer.panels[panelIdx] = select.value;
        renderImageViewer();
      }
    });
  });

  el.imageGrid.querySelectorAll('.cam-remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panelIdx = Number(btn.dataset.panelIdx);
      if (Number.isInteger(panelIdx) && state.imageViewer.panels.length > 1) {
        state.imageViewer.panels.splice(panelIdx, 1);
        renderImageViewer();
      }
    });
  });

  el.imageGrid.querySelectorAll('.cam-frame-img').forEach((img) => {
    img.addEventListener('click', () => {
      const panelIdx = Number(img.dataset.panelIdx);
      const frameIdx = Number(img.dataset.frameIdx);
      if (Number.isInteger(panelIdx) && Number.isInteger(frameIdx)) {
        openFullscreen(panelIdx, frameIdx);
      }
    });
    img.style.cursor = 'zoom-in';
  });
}

function updateImageTile(panelIdx, topicName) {
  const tile = el.imageGrid.querySelector(`.cam-tile[data-panel-idx="${panelIdx}"]`);
  if (!tile) return;

  const select = tile.querySelector('.cam-topic-select');
  const stage = tile.querySelector('.cam-tile-stage');
  const img = tile.querySelector('.cam-frame-img');
  const empty = tile.querySelector('.cam-tile-empty');
  const overlay = tile.querySelector('.image-meta-overlay');
  const metaIndex = tile.querySelector('.cam-meta-index');
  const metaRelative = tile.querySelector('.cam-meta-relative');
  const metaAbsolute = tile.querySelector('.cam-meta-absolute');
  const metaSize = tile.querySelector('.cam-meta-size');
  const frames = getFramesForTopic(topicName);

  if (select && select.value !== topicName) {
    select.value = topicName;
  }

  if (!frames.length) {
    if (panelIdx === 0) state.imageViewer.primaryFrameIndex = -1;
    stage?.classList.add('cam-tile-stage-empty');
    img?.classList.add('hidden');
    empty?.classList.remove('hidden');
    overlay?.classList.add('hidden');
    if (empty) empty.textContent = '此 topic 无帧数据';
    if (img) {
      img.dataset.frameIdx = '';
      img.removeAttribute('src');
      img.dataset.displayedSrc = '';
      img.dataset.pendingSrc = '';
    }
    return;
  }

  const idx = findNearestFrameIndex(frames, state.cursor.t);
  if (panelIdx === 0) state.imageViewer.primaryFrameIndex = idx;
  const frame = frames[idx];
  // 本地访问，优先加载原图（frame.file），preview 只有 320px + quality 72，缩放后模糊。
  const src = resolveFrameSrc(frame, { preferPreview: false });
  const absoluteTime = fmtAbsoluteSecFromOrigin(frame.t);

  stage?.classList.remove('cam-tile-stage-empty');
  img?.classList.remove('hidden');
  empty?.classList.add('hidden');
  overlay?.classList.remove('hidden');

  if (img) {
    img.dataset.panelIdx = String(panelIdx);
    img.dataset.frameIdx = String(idx);
    img.alt = `${topicName} frame ${idx + 1}`;
    syncImageElementSource(img, src);
  }

  if (metaIndex) metaIndex.innerHTML = `<strong>帧 ${idx + 1}</strong> / ${frames.length}`;
  if (metaRelative) metaRelative.textContent = fmtSec(frame.t);
  if (metaAbsolute) {
    metaAbsolute.textContent = absoluteTime;
    metaAbsolute.classList.toggle('hidden', !absoluteTime);
  }
  if (metaSize) metaSize.textContent = `${frame.width || '?'}×${frame.height || '?'}`;
}

function renderImageViewer() {
  if (!el.imageGrid) return;
  const imageTopics = getImageTopics(true);

  if (!imageTopics.length) {
    el.imageEmpty?.classList.remove('hidden');
    el.imageGrid.innerHTML = '';
    state.imageViewer.gridSignature = '';
    if (el.addImagePanelBtn) el.addImagePanelBtn.disabled = true;
    state.imageViewer.panels = [];
    state.imageViewer.primaryFrameIndex = -1;
    return;
  }

  syncImagePanels();
  el.imageEmpty?.classList.add('hidden');
  if (el.addImagePanelBtn) {
    el.addImagePanelBtn.disabled = state.imageViewer.panels.length >= MAX_IMAGE_PANELS;
  }

  const canRemove = state.imageViewer.panels.length > 1;
  const columns = Math.min(state.imageViewer.panels.length, 3);
  el.imageGrid.style.setProperty('--cam-columns', String(columns));
  const gridSignature = getImageGridSignature(imageTopics, canRemove);
  if (state.imageViewer.gridSignature !== gridSignature) {
    el.imageGrid.innerHTML = state.imageViewer.panels
      .map((name, idx) => buildImageTileHtml(idx, name, canRemove))
      .join('');
    state.imageViewer.gridSignature = gridSignature;
    bindImageGridEvents();
  }

  state.imageViewer.panels.forEach((name, idx) => updateImageTile(idx, name));
}

function syncOdomControls() {
  const odomTopics = getOdomTopics();
  el.odomTopicSelect.innerHTML = odomTopics
    .map((topic) => `<option value="${escapeHtml(topic.name)}" ${topic.name === state.odomConfig.topic ? 'selected' : ''}>${escapeHtml(topic.name)}</option>`)
    .join('');
  if (!odomTopics.length) {
    state.odomConfig.topic = '';
  } else if (!odomTopics.some((topic) => topic.name === state.odomConfig.topic)) {
    state.odomConfig.topic = odomTopics[0].name;
  }
  el.transformModeSelect.value = state.odomConfig.mode;
  el.txInput.value = String(state.odomConfig.tx);
  el.tyInput.value = String(state.odomConfig.ty);
  el.yawInput.value = String(state.odomConfig.yawDeg);
  state.odomConfig.localCoordinateMode = normalizeLocalCoordinateMode(
    state.odomConfig.localCoordinateMode || (isLikelyLegacyPolarConfig(state.odomConfig) ? 'polar' : 'xy'),
  );
  const options = getGlobalNumericFieldSources();
  const suggestedKeys = getSuggestedLocalSourceKeys(state.odomConfig.localCoordinateMode, options);
  const optionHtml = options.length
    ? options.map((source) => `<option value="${escapeHtml(source.key)}">${escapeHtml(source.label)}</option>`).join('')
    : '<option value="">（无数值字段）</option>';
  if (el.odomLocalXSelect) {
    el.odomLocalXSelect.innerHTML = optionHtml;
    if (!options.some((item) => item.key === state.odomConfig.localXSourceKey)) {
      state.odomConfig.localXSourceKey = suggestedKeys.xKey || options[0]?.key || '';
    }
    el.odomLocalXSelect.value = state.odomConfig.localXSourceKey;
    el.odomLocalXSelect.disabled = options.length === 0;
  }
  if (el.odomLocalYSelect) {
    el.odomLocalYSelect.innerHTML = optionHtml;
    const fallbackY = options.find((item) => item.key !== state.odomConfig.localXSourceKey)?.key || options[0]?.key || '';
    if (!options.some((item) => item.key === state.odomConfig.localYSourceKey)) {
      state.odomConfig.localYSourceKey = suggestedKeys.yKey || fallbackY;
    }
    if (state.odomConfig.localYSourceKey === state.odomConfig.localXSourceKey) {
      state.odomConfig.localYSourceKey = fallbackY;
    }
    el.odomLocalYSelect.value = state.odomConfig.localYSourceKey;
    el.odomLocalYSelect.disabled = options.length === 0;
  }
  if (el.odomLocalEnable) el.odomLocalEnable.checked = !!state.odomConfig.localXYEnabled;
  const modeDefaults = getLocalCoordinateModeDefaults(state.odomConfig.localCoordinateMode);
  if (!state.odomConfig.localXExpr) state.odomConfig.localXExpr = modeDefaults.xExpr;
  if (!state.odomConfig.localYExpr) state.odomConfig.localYExpr = modeDefaults.yExpr;
  if (el.odomLocalCoordinateMode) el.odomLocalCoordinateMode.value = state.odomConfig.localCoordinateMode;
  if (el.odomLocalXExpr) el.odomLocalXExpr.value = state.odomConfig.localXExpr || modeDefaults.xExpr;
  if (el.odomLocalYExpr) el.odomLocalYExpr.value = state.odomConfig.localYExpr || modeDefaults.yExpr;
  syncOdomLocalModeUi();
  updateOdomLocalStatus();
}

function transformTrajectoryPoints(samples) {
  return transformOdomSamplesToGlobal(samples);
}

function drawTrajectory() {
  const topic = getTopic(state.odomConfig.topic);
  const samples = topic?.odom_track?.samples || [];
  if (!samples.length) {
    drawEmptyCanvas(el.trajectoryCanvas, '当前没有可用的 odom 轨迹。');
    el.trajectorySummary.innerHTML = '';
    return;
  }

  const points = transformTrajectoryPoints(samples);
  const overlayPoints = getOdomLocalOverlayPoints();
  const currentPose = sampleOdomPoseAt(points, state.cursor.t);
  const currentTargetPoint = sampleTimedXYPointAt(overlayPoints, state.cursor.t);
  const { ctx, width, height } = setupCanvas(el.trajectoryCanvas, 420);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 30, right: 30, bottom: 44, left: 52 };
  const availableWidth = width - padding.left - padding.right;
  const availableHeight = height - padding.top - padding.bottom;
  const plotSize = Math.min(availableWidth, availableHeight);
  const plotLeft = padding.left + (availableWidth - plotSize) / 2;
  const plotTop = padding.top + (availableHeight - plotSize) / 2;

  const allGlobalPoints = points.concat(overlayPoints.map((point) => ({ gx: point.x, gy: point.y })));
  let xMin = Math.min(...allGlobalPoints.map((point) => point.gx));
  let xMax = Math.max(...allGlobalPoints.map((point) => point.gx));
  let yMin = Math.min(...allGlobalPoints.map((point) => point.gy));
  let yMax = Math.max(...allGlobalPoints.map((point) => point.gy));

  if (xMax === xMin) { xMax += 1; xMin -= 1; }
  if (yMax === yMin) { yMax += 1; yMin -= 1; }

  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const maxRange = Math.max(xRange, yRange);
  const halfSpan = maxRange * 0.58;
  const centerX = (xMin + xMax) / 2;
  const centerY = (yMin + yMax) / 2;
  xMin = centerX - halfSpan;
  xMax = centerX + halfSpan;
  yMin = centerY - halfSpan;
  yMax = centerY + halfSpan;

  const scale = plotSize / Math.max(xMax - xMin, 1e-6);
  const xScale = (value) => plotLeft + (value - xMin) * scale;
  const yScale = (value) => plotTop + plotSize - (value - yMin) * scale;

  ctx.strokeStyle = 'rgba(148,163,184,0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i += 1) {
    const x = plotLeft + (plotSize / 6) * i;
    const y = plotTop + (plotSize / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, plotTop + plotSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotLeft + plotSize, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#5ba2ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = xScale(point.gx);
    const y = yScale(point.gy);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const start = points[0];
  const end = points[points.length - 1];
  ctx.fillStyle = '#47c97e';
  ctx.beginPath();
  ctx.arc(xScale(start.gx), yScale(start.gy), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.arc(xScale(end.gx), yScale(end.gy), 6, 0, Math.PI * 2);
  ctx.fill();

  if (overlayPoints.length) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    overlayPoints.forEach((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const localStart = overlayPoints[0];
    const localEnd = overlayPoints[overlayPoints.length - 1];
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(xScale(localStart.x), yScale(localStart.y), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(xScale(localEnd.x), yScale(localEnd.y), 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (currentPose) {
    drawHeadingArrow(
      ctx,
      xScale(currentPose.gx),
      yScale(currentPose.gy),
      currentPose.gyaw_deg,
      { color: '#111827', lengthPx: 46 },
    );
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(xScale(currentPose.gx), yScale(currentPose.gy), 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (currentTargetPoint) {
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(xScale(currentTargetPoint.x), yScale(currentTargetPoint.y), 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#1a2744';
  ctx.font = '13px "Segoe UI", sans-serif';
  ctx.fillText('Global X (m)', plotLeft + plotSize - 96, height - 12);
  ctx.save();
  ctx.translate(18, plotTop + plotSize / 2 + 26);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Global Y (m)', 0, 0);
  ctx.restore();

  const legendItems = [
    { color: '#5ba2ff', text: 'Odom 全局轨迹' },
    overlayPoints.length ? { color: '#f59e0b', text: '局部XY→全局' } : null,
    currentPose ? { color: '#0f172a', text: '当前全局坐标' } : null,
    currentPose ? { color: '#111827', text: 'Pose 朝向' } : null,
    currentTargetPoint ? { color: '#f59e0b', text: '当前目标坐标' } : null,
  ].filter(Boolean);
  let legendX = plotLeft + 8;
  legendItems.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX, plotTop - 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillText(item.text, legendX + 10, plotTop - 8);
    legendX += ctx.measureText(item.text).width + 28;
  });

  el.trajectorySummary.innerHTML = [
    `<div class="inline-pill">轨迹点数 ${escapeHtml(String(points.length))}</div>`,
    `<div class="inline-pill">X [${escapeHtml(fmtNumber(Math.min(...allGlobalPoints.map((p) => p.gx)), 2))}, ${escapeHtml(fmtNumber(Math.max(...allGlobalPoints.map((p) => p.gx)), 2))}]</div>`,
    `<div class="inline-pill">Y [${escapeHtml(fmtNumber(Math.min(...allGlobalPoints.map((p) => p.gy)), 2))}, ${escapeHtml(fmtNumber(Math.max(...allGlobalPoints.map((p) => p.gy)), 2))}]</div>`,
    `<div class="inline-pill">模式 ${escapeHtml(state.odomConfig.mode)}</div>`,
    currentPose ? `<div class="inline-pill">全局点 (${escapeHtml(fmtNumber(currentPose.gx, 2))}, ${escapeHtml(fmtNumber(currentPose.gy, 2))})</div>` : '',
    currentPose ? `<div class="inline-pill">朝向 ${escapeHtml(fmtNumber(currentPose.gyaw_deg, 1))}°</div>` : '',
    currentTargetPoint ? `<div class="inline-pill">目标点 (${escapeHtml(fmtNumber(currentTargetPoint.x, 2))}, ${escapeHtml(fmtNumber(currentTargetPoint.y, 2))})</div>` : '',
    overlayPoints.length ? `<div class="inline-pill">局部XY→全局 ${escapeHtml(String(overlayPoints.length))} 点</div>` : '',
  ].filter(Boolean).join('');
}

function renderVisuals() {
  renderLayoutVisibility();
  const seriesList = getRenderedSeries();
  renderPlotPanels(seriesList);
  drawOdomLocalPreview();
  drawTrajectory();
  renderTimeline();
  renderImageViewer();
  updateCursorMeta();
  refreshRecordingUi();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextAnimationFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function setRecordingStatus(message, tone = 'muted') {
  if (!el.recordingStatus) return;
  el.recordingStatus.textContent = message;
  el.recordingStatus.classList.remove('is-active', 'is-success', 'is-error');
  if (tone === 'active') el.recordingStatus.classList.add('is-active');
  if (tone === 'success') el.recordingStatus.classList.add('is-success');
  if (tone === 'error') el.recordingStatus.classList.add('is-error');
}

function clearCachedRecording() {
  state.recording.lastBlob = null;
  state.recording.lastWebmFileName = '';
}

function refreshRecordingUi() {
  if (!el.recordPlaybackBtn) return;
  if (state.recording.isExporting) {
    el.recordPlaybackBtn.disabled = true;
    el.recordPlaybackBtn.textContent = '导出中…';
  } else if (state.recording.isConvertingMp4) {
    el.recordPlaybackBtn.disabled = true;
    el.recordPlaybackBtn.textContent = '录制回放';
  } else {
    el.recordPlaybackBtn.disabled = (!state.manifest && !state.recording.isActive);
    el.recordPlaybackBtn.textContent = '录制回放';
  }
  if (state.recording.isActive) {
    el.recordPlaybackBtn.textContent = state.recording.stopRequested ? '停止中…' : '停止录制';
  }
  if (el.downloadMp4Btn) {
    if (state.recording.isConvertingMp4) {
      el.downloadMp4Btn.disabled = true;
      el.downloadMp4Btn.textContent = '转换中…';
    } else {
      el.downloadMp4Btn.disabled = !state.recording.lastBlob || state.recording.isActive || state.recording.isExporting;
      el.downloadMp4Btn.textContent = '下载 MP4';
    }
  }
}

function setRecordingReadyHint() {
  if (!state.manifest || state.recording.isActive || state.recording.isExporting || state.recording.isConvertingMp4) return;
  const duration = Math.max(state.cursor.tMax - state.cursor.tMin, 0);
  const estimatedVideoSec = duration > 0
    ? Math.max(duration / state.recording.playbackRate, 0.1)
    : 0;
  const parts = [
    '按当前四窗口布局导出 WebM',
    `${state.recording.playbackRate}x 回放`,
    `${state.recording.fps} fps`,
  ];
  if (estimatedVideoSec > 0) {
    parts.push(`约 ${fmtNumber(estimatedVideoSec, 1)} s 视频`);
  }
  if (state.recording.lastBlob) {
    parts.push('最近一段 WebM 已就绪，可单独下载 MP4');
  }
  setRecordingStatus(parts.join(' · '));
}

function createRoundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawRecordingBackdrop(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#dde8f5');
  gradient.addColorStop(0.52, '#eef3fa');
  gradient.addColorStop(1, '#dbeafe');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const haloA = ctx.createRadialGradient(width * 0.12, height * 0.08, 0, width * 0.12, height * 0.08, width * 0.42);
  haloA.addColorStop(0, 'rgba(91, 162, 255, 0.16)');
  haloA.addColorStop(1, 'rgba(91, 162, 255, 0)');
  ctx.fillStyle = haloA;
  ctx.fillRect(0, 0, width, height);

  const haloB = ctx.createRadialGradient(width * 0.88, height * 0.94, 0, width * 0.88, height * 0.94, width * 0.34);
  haloB.addColorStop(0, 'rgba(107, 214, 255, 0.18)');
  haloB.addColorStop(1, 'rgba(107, 214, 255, 0)');
  ctx.fillStyle = haloB;
  ctx.fillRect(0, 0, width, height);
}

function fitTextToWidth(ctx, text, maxWidth) {
  const source = String(text || '').trim();
  if (!source) return '';
  if (ctx.measureText(source).width <= maxWidth) return source;
  let result = source;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function drawPillRows(ctx, items, rect, options = {}) {
  const values = items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (!values.length) return 0;

  const paddingX = options.paddingX ?? 12;
  const pillHeight = options.height ?? 26;
  const gapX = options.gapX ?? 8;
  const gapY = options.gapY ?? 8;
  const font = options.font ?? '500 13px "Avenir Next", "PingFang SC", sans-serif';
  const fill = options.fill ?? 'rgba(148, 163, 184, 0.12)';
  const stroke = options.stroke ?? 'rgba(80, 110, 160, 0.12)';
  const color = options.color ?? '#334155';
  const radius = options.radius ?? 999;

  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'middle';
  let x = rect.x;
  let y = rect.y;
  values.forEach((item) => {
    const maxPillWidth = rect.w;
    const rawWidth = ctx.measureText(item).width + paddingX * 2;
    const pillWidth = Math.min(Math.max(rawWidth, 86), maxPillWidth);
    if (x > rect.x && x + pillWidth > rect.x + rect.w) {
      x = rect.x;
      y += pillHeight + gapY;
    }
    createRoundRectPath(ctx, x, y, pillWidth, pillHeight, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(fitTextToWidth(ctx, item, pillWidth - paddingX * 2), x + paddingX, y + pillHeight / 2 + 0.5);
    x += pillWidth + gapX;
  });
  ctx.restore();
  return y + pillHeight - rect.y;
}

function drawPanelCard(ctx, rect, title, subtitle) {
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  createRoundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 26);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fill();
  ctx.restore();

  createRoundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 26);
  ctx.strokeStyle = 'rgba(80, 110, 160, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = '#1a2744';
  ctx.font = '600 28px "Avenir Next", "PingFang SC", sans-serif';
  ctx.fillText(fitTextToWidth(ctx, title, rect.w - 46), rect.x + 24, rect.y + 36);
  if (subtitle) {
    ctx.fillStyle = '#5a6a8a';
    ctx.font = '500 15px "Avenir Next", "PingFang SC", sans-serif';
    ctx.fillText(fitTextToWidth(ctx, subtitle, rect.w - 46), rect.x + 24, rect.y + 62);
  }
  ctx.restore();

  return {
    x: rect.x + 20,
    y: rect.y + 82,
    w: rect.w - 40,
    h: rect.h - 102,
  };
}

function drawMediaContain(ctx, source, rect) {
  const sourceWidth = source?.videoWidth || source?.naturalWidth || source?.width || 0;
  const sourceHeight = source?.videoHeight || source?.naturalHeight || source?.height || 0;
  if (!(sourceWidth > 0) || !(sourceHeight > 0) || rect.w <= 0 || rect.h <= 0) return;
  const scale = Math.min(rect.w / sourceWidth, rect.h / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = rect.x + (rect.w - drawWidth) / 2;
  const drawY = rect.y + (rect.h - drawHeight) / 2;
  ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
}

function getPanelHeading(panel) {
  return {
    title: panel?.querySelector('.section-header h2')?.textContent?.trim() || '未命名面板',
    subtitle: panel?.querySelector('.section-header p')?.textContent?.trim() || '',
  };
}

function drawPanelUnavailable(ctx, rect, message) {
  createRoundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 18);
  ctx.fillStyle = 'rgba(235, 240, 252, 0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.stroke();
  ctx.fillStyle = '#5a6a8a';
  ctx.font = '500 16px "Avenir Next", "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

function drawRecordingImagePanel(ctx, rect) {
  const panel = el.imagePanel;
  const heading = getPanelHeading(panel);
  const contentRect = drawPanelCard(ctx, rect, heading.title, heading.subtitle);
  if (!panel || panel.classList.contains('hidden')) {
    drawPanelUnavailable(ctx, contentRect, '图像浏览器当前已隐藏');
    return;
  }

  const tiles = [...(el.imageGrid?.querySelectorAll('.cam-tile') || [])];
  if (!tiles.length) {
    drawPanelUnavailable(ctx, contentRect, '当前数据集没有可录制的图像流');
    return;
  }

  const cols = tiles.length <= 2 ? tiles.length : Math.min(3, Math.ceil(Math.sqrt(tiles.length)));
  const rows = Math.ceil(tiles.length / Math.max(cols, 1));
  const gap = 14;
  const tileWidth = (contentRect.w - gap * (cols - 1)) / cols;
  const tileHeight = (contentRect.h - gap * (rows - 1)) / rows;

  tiles.forEach((tile, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const tileRect = {
      x: contentRect.x + col * (tileWidth + gap),
      y: contentRect.y + row * (tileHeight + gap),
      w: tileWidth,
      h: tileHeight,
    };

    createRoundRectPath(ctx, tileRect.x, tileRect.y, tileRect.w, tileRect.h, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.stroke();

    const topicLabel = tile.querySelector('.cam-topic-select')?.selectedOptions?.[0]?.textContent?.trim()
      || `相机 ${index + 1}`;
    const imageRect = {
      x: tileRect.x + 12,
      y: tileRect.y + 48,
      w: tileRect.w - 24,
      h: tileRect.h - 60,
    };
    createRoundRectPath(ctx, imageRect.x, imageRect.y, imageRect.w, imageRect.h, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.save();
    ctx.fillStyle = '#1a2744';
    ctx.font = '600 15px "Avenir Next", "PingFang SC", sans-serif';
    ctx.fillText(fitTextToWidth(ctx, topicLabel, tileRect.w - 24), tileRect.x + 12, tileRect.y + 28);
    ctx.restore();

    const imageEl = tile.querySelector('.cam-frame-img');
    if (imageEl && imageEl.src && imageEl.complete && imageEl.naturalWidth > 0) {
      ctx.save();
      createRoundRectPath(ctx, imageRect.x, imageRect.y, imageRect.w, imageRect.h, 14);
      ctx.clip();
      drawMediaContain(ctx, imageEl, imageRect);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.28)';
      ctx.font = '500 15px "Avenir Next", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('等待图像加载', imageRect.x + imageRect.w / 2, imageRect.y + imageRect.h / 2);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    const metaTexts = [...tile.querySelectorAll('.image-meta-overlay .meta-pill')]
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    drawPillRows(ctx, metaTexts, {
      x: imageRect.x + 12,
      y: imageRect.y + imageRect.h - 36,
      w: imageRect.w - 24,
      h: 36,
    }, {
      height: 24,
      font: '500 11px "JetBrains Mono", monospace',
      fill: 'rgba(15, 23, 42, 0.8)',
      stroke: 'rgba(255, 255, 255, 0.08)',
      color: 'rgba(239, 244, 255, 0.98)',
      gapX: 6,
      gapY: 6,
      paddingX: 10,
    });
  });
}

function drawRecordingTimelinePanel(ctx, rect) {
  const panel = el.timelinePanel;
  const heading = getPanelHeading(panel);
  const contentRect = drawPanelCard(ctx, rect, heading.title, heading.subtitle);
  if (!panel || panel.classList.contains('hidden')) {
    drawPanelUnavailable(ctx, contentRect, '时间轴联动当前已隐藏');
    return;
  }

  const metaTexts = [...(el.cursorMeta?.querySelectorAll('.inline-pill') || [])]
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const metaHeight = drawPillRows(ctx, metaTexts, {
    x: contentRect.x,
    y: contentRect.y,
    w: contentRect.w,
    h: 60,
  }, {
    height: 28,
    font: '500 13px "Avenir Next", "PingFang SC", sans-serif',
  });

  const sliderHeight = 22;
  const sampleTop = contentRect.y + contentRect.h - 132;
  const timelineRect = {
    x: contentRect.x,
    y: contentRect.y + metaHeight + 12,
    w: contentRect.w,
    h: Math.max(120, sampleTop - contentRect.y - metaHeight - 24),
  };
  createRoundRectPath(ctx, timelineRect.x, timelineRect.y, timelineRect.w, timelineRect.h, 16);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.stroke();
  drawMediaContain(ctx, el.timelineCanvas, {
    x: timelineRect.x + 12,
    y: timelineRect.y + 12,
    w: timelineRect.w - 24,
    h: timelineRect.h - 24,
  });

  const sliderRect = {
    x: contentRect.x + 12,
    y: timelineRect.y + timelineRect.h + 14,
    w: contentRect.w - 24,
    h: sliderHeight,
  };
  const ratio = el.cursorSlider ? Number(el.cursorSlider.value || 0) / Number(el.cursorSlider.max || CURSOR_SLIDER_STEPS) : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(91, 162, 255, 0.16)';
  createRoundRectPath(ctx, sliderRect.x, sliderRect.y + 7, sliderRect.w, 8, 999);
  ctx.fill();
  createRoundRectPath(ctx, sliderRect.x, sliderRect.y + 7, sliderRect.w * ratio, 8, 999);
  ctx.fillStyle = 'rgba(91, 162, 255, 0.72)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sliderRect.x + sliderRect.w * ratio, sliderRect.y + 11, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(91, 162, 255, 0.82)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const samples = [...(el.cursorSamples?.querySelectorAll('.cursor-sample') || [])]
    .map((node) => {
      const label = node.querySelector('strong')?.textContent?.trim() || '';
      const value = node.querySelector('.mono')?.textContent?.trim() || '';
      return `${label}: ${value}`;
    })
    .filter(Boolean);
  drawPillRows(ctx, samples, {
    x: contentRect.x,
    y: sliderRect.y + sliderRect.h + 12,
    w: contentRect.w,
    h: Math.max(40, contentRect.y + contentRect.h - (sliderRect.y + sliderRect.h + 12)),
  }, {
    height: 28,
    font: '500 12px "JetBrains Mono", monospace',
    fill: 'rgba(235, 240, 252, 0.9)',
  });
}

function drawRecordingXYPanel(ctx, rect) {
  const panel = el.xyPanelSection;
  const heading = getPanelHeading(panel?.querySelector('.panel') || panel);
  const contentRect = drawPanelCard(ctx, rect, heading.title, heading.subtitle);
  if (!panel || panel.classList.contains('hidden')) {
    drawPanelUnavailable(ctx, contentRect, 'XY 子图工作区当前已隐藏');
    return;
  }

  const cards = [...(el.plotPanels?.querySelectorAll('.subplot-card') || [])];
  if (!cards.length) {
    drawPanelUnavailable(ctx, contentRect, '当前没有 XY 坐标组');
    return;
  }

  const cols = cards.length > 1 ? 2 : 1;
  const rows = Math.ceil(cards.length / cols);
  const gap = 14;
  const cardWidth = (contentRect.w - gap * (cols - 1)) / cols;
  const cardHeight = (contentRect.h - gap * (rows - 1)) / rows;

  cards.forEach((card, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cardRect = {
      x: contentRect.x + col * (cardWidth + gap),
      y: contentRect.y + row * (cardHeight + gap),
      w: cardWidth,
      h: cardHeight,
    };
    createRoundRectPath(ctx, cardRect.x, cardRect.y, cardRect.w, cardRect.h, 18);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.stroke();

    const title = card.querySelector('.subplot-header strong')?.textContent?.trim() || `坐标组 ${index + 1}`;
    const transformLabel = card.querySelector('[data-action="subplot-transform"]')?.selectedOptions?.[0]?.textContent?.trim() || '';
    ctx.save();
    ctx.fillStyle = '#1a2744';
    ctx.font = '600 16px "Avenir Next", "PingFang SC", sans-serif';
    ctx.fillText(fitTextToWidth(ctx, title, cardRect.w - 24), cardRect.x + 12, cardRect.y + 24);
    if (transformLabel) {
      ctx.fillStyle = '#5a6a8a';
      ctx.font = '500 12px "Avenir Next", "PingFang SC", sans-serif';
      ctx.fillText(fitTextToWidth(ctx, transformLabel, cardRect.w - 24), cardRect.x + 12, cardRect.y + 42);
    }
    ctx.restore();

    const canvasRect = {
      x: cardRect.x + 12,
      y: cardRect.y + 52,
      w: cardRect.w - 24,
      h: Math.max(90, cardRect.h - 124),
    };
    createRoundRectPath(ctx, canvasRect.x, canvasRect.y, canvasRect.w, canvasRect.h, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    drawMediaContain(ctx, card.querySelector('canvas'), canvasRect);

    const stats = [...card.querySelectorAll('.stats-inline .inline-pill')]
      .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 4);
    drawPillRows(ctx, stats, {
      x: cardRect.x + 12,
      y: cardRect.y + cardRect.h - 52,
      w: cardRect.w - 24,
      h: 40,
    }, {
      height: 24,
      font: '500 11px "JetBrains Mono", monospace',
      gapX: 6,
      gapY: 6,
      paddingX: 10,
    });
  });
}

function drawRecordingTrajectoryPanel(ctx, rect) {
  const panel = el.odomTrajectoryPanel;
  const heading = getPanelHeading(panel);
  const contentRect = drawPanelCard(ctx, rect, heading.title, heading.subtitle);
  if (!panel || panel.classList.contains('hidden')) {
    drawPanelUnavailable(ctx, contentRect, 'Odom 全局轨迹当前已隐藏');
    return;
  }

  const canvasRect = {
    x: contentRect.x,
    y: contentRect.y,
    w: contentRect.w,
    h: contentRect.h - 72,
  };
  createRoundRectPath(ctx, canvasRect.x, canvasRect.y, canvasRect.w, canvasRect.h, 18);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.stroke();
  drawMediaContain(ctx, el.trajectoryCanvas, {
    x: canvasRect.x + 12,
    y: canvasRect.y + 12,
    w: canvasRect.w - 24,
    h: canvasRect.h - 24,
  });

  const summary = [...(el.trajectorySummary?.querySelectorAll('.inline-pill') || [])]
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  drawPillRows(ctx, summary, {
    x: contentRect.x,
    y: canvasRect.y + canvasRect.h + 12,
    w: contentRect.w,
    h: 60,
  }, {
    height: 28,
    font: '500 12px "JetBrains Mono", monospace',
  });
}

function getRecordingLayout(width, height) {
  const margin = 28;
  const gap = 22;
  const columnLeft = Math.floor((width - margin * 2 - gap) * 0.47);
  const columnRight = width - margin * 2 - gap - columnLeft;
  const rowTop = Math.floor((height - margin * 2 - gap) * 0.5);
  const rowBottom = height - margin * 2 - gap - rowTop;
  return {
    image: { x: margin, y: margin, w: columnLeft, h: rowTop },
    trajectory: { x: margin + columnLeft + gap, y: margin, w: columnRight, h: rowTop },
    timeline: { x: margin, y: margin + rowTop + gap, w: columnLeft, h: rowBottom },
    xy: { x: margin + columnLeft + gap, y: margin + rowTop + gap, w: columnRight, h: rowBottom },
  };
}

function renderRecordingCompositeFrame(targetCanvas) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;
  const width = targetCanvas.width;
  const height = targetCanvas.height;
  drawRecordingBackdrop(ctx, width, height);

  ctx.save();
  ctx.fillStyle = '#1e293b';
  ctx.font = '600 18px "Avenir Next", "PingFang SC", sans-serif';
  const datasetId = el.datasetSelect?.value || 'dataset';
  ctx.fillText(`Bag Studio 回放录制 · ${datasetId}`, 34, 24);
  ctx.font = '500 14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(`t=${fmtNumber(state.cursor.t, 3)} s`, width - 168, 24);
  ctx.restore();

  const layout = getRecordingLayout(width, height);
  drawRecordingImagePanel(ctx, layout.image);
  drawRecordingTrajectoryPanel(ctx, layout.trajectory);
  drawRecordingTimelinePanel(ctx, layout.timeline);
  drawRecordingXYPanel(ctx, layout.xy);
}

async function waitForVisibleImages(timeoutMs = 1200) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const images = [...(el.imageGrid?.querySelectorAll('.cam-frame-img:not(.hidden)') || [])];
    const allReady = images.every((img) => !img.dataset.pendingSrc && (!img.src || (img.complete && img.naturalWidth > 0)));
    if (allReady) return true;
    await nextAnimationFrame();
  }
  return false;
}

function getRecordingMimeType() {
  if (typeof window.MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return candidates.find((mime) => !window.MediaRecorder.isTypeSupported || window.MediaRecorder.isTypeSupported(mime)) || '';
}

function cleanupRecordingResources() {
  if (state.recording.stream) {
    state.recording.stream.getTracks().forEach((track) => track.stop());
  }
  state.recording.recorder = null;
  state.recording.stream = null;
  state.recording.canvas = null;
}

function downloadRecordingBlob(blob, fileName) {
  if (state.recording.lastDownloadUrl) {
    URL.revokeObjectURL(state.recording.lastDownloadUrl);
    state.recording.lastDownloadUrl = '';
  }
  const downloadUrl = URL.createObjectURL(blob);
  state.recording.lastDownloadUrl = downloadUrl;
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function buildRecordingFileName() {
  const datasetId = (el.datasetSelect?.value || 'bag_studio').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${datasetId}_playback_${stamp}.webm`;
}

function buildRecordingMp4FileName() {
  const sourceName = state.recording.lastWebmFileName || buildRecordingFileName();
  return sourceName.replace(/\.webm$/i, '.mp4');
}

function stopPlaybackRecording() {
  if (!state.recording.isActive) return;
  state.recording.stopRequested = true;
  setRecordingStatus('正在停止录制并导出当前已完成片段…', 'active');
  refreshRecordingUi();
}

async function downloadMp4FromLastRecording() {
  if (!state.recording.lastBlob || state.recording.isActive || state.recording.isExporting || state.recording.isConvertingMp4) return;
  state.recording.isConvertingMp4 = true;
  refreshRecordingUi();
  setRecordingStatus('正在调用 ffmpeg 转 MP4（libx264，检测到音频时会一起转 AAC）…', 'active');

  try {
    const formData = new FormData();
    formData.append('recording', state.recording.lastBlob, state.recording.lastWebmFileName || buildRecordingFileName());
    const response = await fetch('/api/recordings/convert_mp4', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const payload = await response.json();
        if (payload?.error) message = payload.error;
      } catch (_) {}
      throw new Error(message);
    }
    const blob = await response.blob();
    downloadRecordingBlob(blob, buildRecordingMp4FileName());
    setRecordingStatus(`MP4 转换完成，已开始下载 ${fmtNumber(blob.size / 1024 / 1024, 1)} MB 文件。`, 'success');
  } catch (error) {
    console.error(error);
    setRecordingStatus(`MP4 转换失败：${error?.message || '未知错误'}`, 'error');
  } finally {
    state.recording.isConvertingMp4 = false;
    refreshRecordingUi();
  }
}

async function startPlaybackRecording() {
  if (!state.manifest || state.recording.isActive || state.recording.isExporting || state.recording.isConvertingMp4) return;
  const mimeType = getRecordingMimeType();
  if (!mimeType) {
    setRecordingStatus('当前浏览器不支持 WebM 录制，请换用 Chromium 内核浏览器。', 'error');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = RECORDING_DEFAULTS.width;
  canvas.height = RECORDING_DEFAULTS.height;
  if (typeof canvas.captureStream !== 'function') {
    setRecordingStatus('当前浏览器不支持画布录屏。', 'error');
    return;
  }

  const fps = state.recording.fps;
  const captureIntervalMs = Math.max(1000 / fps, 35);
  const originalCursor = state.cursor.t;
  const duration = Math.max(state.cursor.tMax - state.cursor.tMin, 0);
  const baseStep = Math.max(state.recording.playbackRate / fps, 1 / fps);
  const estimatedFrames = Math.max(2, Math.ceil(duration / Math.max(baseStep, 1e-6)) + 1);
  const frameCount = Math.min(RECORDING_DEFAULTS.maxFrames, estimatedFrames);
  const frameStep = frameCount > 1 ? duration / (frameCount - 1) : 0;
  const effectivePlaybackRate = duration > 0 ? duration / Math.max((frameCount - 1) / fps, 1e-6) : state.recording.playbackRate;
  const chunks = [];
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 12_000_000,
  });

  const stopPromise = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(recorder.error || new Error('录制失败'));
    recorder.onstop = () => resolve();
  });

  state.recording.isActive = true;
  state.recording.isExporting = false;
  state.recording.stopRequested = false;
  state.recording.recorder = recorder;
  state.recording.stream = stream;
  state.recording.canvas = canvas;
  clearCachedRecording();
  refreshRecordingUi();
  setRecordingStatus(`准备录制 ${frameCount} 帧 · 约 ${fmtNumber((frameCount - 1) / fps, 1)} s 视频 · 请尽量不要操作页面`, 'active');

  try {
    setCursor(state.cursor.tMin);
    await nextAnimationFrame();
    await waitForVisibleImages();
    renderRecordingCompositeFrame(canvas);
    recorder.start(Math.max(200, Math.round(captureIntervalMs)));

    for (let frameIdx = 0; frameIdx < frameCount; frameIdx += 1) {
      if (state.recording.stopRequested) break;
      const targetT = frameIdx === frameCount - 1
        ? state.cursor.tMax
        : state.cursor.tMin + frameStep * frameIdx;
      setCursor(targetT);
      await nextAnimationFrame();
      await waitForVisibleImages();
      renderRecordingCompositeFrame(canvas);
      if (frameIdx === 0 || frameIdx === frameCount - 1 || frameIdx % 10 === 0) {
        const percent = Math.round(((frameIdx + 1) / frameCount) * 100);
        setRecordingStatus(`录制中 ${frameIdx + 1}/${frameCount} 帧 · ${percent}% · ${fmtNumber(effectivePlaybackRate, 1)}x 回放`, 'active');
      }
      await sleep(captureIntervalMs);
    }

    state.recording.isActive = false;
    state.recording.isExporting = true;
    refreshRecordingUi();
    setRecordingStatus('正在导出 WebM 文件…', 'active');
    recorder.stop();
    await stopPromise;

    const blob = new Blob(chunks, { type: mimeType });
    state.recording.lastBlob = blob;
    state.recording.lastWebmFileName = buildRecordingFileName();
    downloadRecordingBlob(blob, state.recording.lastWebmFileName);
    setRecordingStatus(`录制完成，已开始下载 ${fmtNumber(blob.size / 1024 / 1024, 1)} MB WebM；如需 MP4 可点击“下载 MP4”。`, 'success');
  } catch (error) {
    console.error(error);
    setRecordingStatus(`录制失败：${error?.message || '未知错误'}`, 'error');
    if (state.recording.recorder && state.recording.recorder.state !== 'inactive') {
      state.recording.recorder.stop();
      try {
        await stopPromise;
      } catch (_) {}
    }
  } finally {
    state.recording.isActive = false;
    state.recording.isExporting = false;
    state.recording.isConvertingMp4 = false;
    state.recording.stopRequested = false;
    cleanupRecordingResources();
    setCursor(originalCursor);
    refreshRecordingUi();
  }
}

function renderLayoutVisibility() {
  const view = normalizeViewConfig(state.viewConfig, DEFAULT_VIEW_CONFIG);
  el.sidebarPanel?.classList.toggle('hidden', !view.showSidebar);
  el.imagePanel?.classList.toggle('hidden', !view.showImage);
  el.timelinePanel?.classList.toggle('hidden', !view.showTimeline);
  el.xyPanelSection?.classList.toggle('hidden', !view.showXY);
  el.odomTrajectoryPanel?.classList.toggle('hidden', !view.showOdom);
  el.odomConfigPanel?.classList.toggle('hidden', !view.showOdom);
  el.workspaceGrid?.classList.toggle('single-column-layout', !view.showSidebar);
  el.topVisualGrid?.classList.toggle('single-panel-layout', !view.showXY);
}

function resetStateForManifest() {
  state.subplots = createDefaultCoordinateGroups();
  if (!state.subplots.length) state.subplots = [createSubplot('坐标组 1')];
  state.seriesConfigs = createDefaultSeries();
  if (!state.seriesConfigs.length && getNumericTopics().length) {
    state.seriesConfigs = [createNumericSeriesConfig()];
  }
  state.layoutPresets = loadLayoutPresets();
  state.activeLayoutPresetId = BUILTIN_DEFAULT_PRESET_ID;

  const odomTopics = getOdomTopics();
  state.odomConfig.topic = odomTopics[0] ? odomTopics[0].name : '';
  state.odomConfig.mode = 'identity';
  state.odomConfig.tx = 0;
  state.odomConfig.ty = 0;
  state.odomConfig.yawDeg = 0;
  state.odomConfig.localXYEnabled = false;
  state.odomConfig.localCoordinateMode = 'xy';
  state.odomConfig.localXSourceKey = '';
  state.odomConfig.localYSourceKey = '';
  state.odomConfig.localXExpr = getLocalCoordinateModeDefaults('xy').xExpr;
  state.odomConfig.localYExpr = getLocalCoordinateModeDefaults('xy').yExpr;
  state.viewConfig = { ...DEFAULT_VIEW_CONFIG };
  syncLayoutPresetSelect();
  applyDefaultLayoutPreset({ silent: true });

  const bag = state.manifest.bag;
  const bagStartMs = bag.bag_start_iso ? new Date(bag.bag_start_iso).getTime() : 0;
  const bagDurationSec = bag.duration_sec ?? 0;
  const startSec = 0;
  const endSec = bagDurationSec || 1;
  state.cursor = { t: startSec, tMin: startSec, tMax: endSec };

  const imageTopics = getImageTopics(true);
  const firstReadyTopic = getImageTopics(false)[0];
  const preferred = firstReadyTopic?.name || imageTopics[0]?.name || '';
  state.imageViewer.panels = preferred ? [preferred] : [];
  state.imageViewer.primaryFrameIndex = -1;
  state.imageViewer.gridSignature = '';
}

async function loadManifest(manifestPath) {
  const response = await fetch(manifestPath, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load manifest: ${manifestPath}`);
  }
  state.manifest = await response.json();
  state.activeDatasetBaseUrl = new URL('./', response.url);
  resetStateForManifest();
  clearCachedRecording();
  renderBagTopicSummary();
  renderSeriesList();
  syncOdomControls();
  el.emptyState.classList.add('hidden');
  el.appMain.classList.remove('hidden');
  renderVisuals();
  setRecordingReadyHint();
}

function syncDatasetSelect() {
  const datasets = state.indexData?.datasets || [];
  el.datasetSelect.innerHTML = datasets
    .map((dataset) => `<option value="${escapeHtml(dataset.id)}">${escapeHtml(dataset.label)} · ${escapeHtml(dataset.generated_at)}</option>`)
    .join('');
}

function getRequestedDatasetId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('dataset');
}

async function bootstrap() {
  loadTheme();
  applyTheme();
  syncThemeControls();
  try {
    const response = await fetch('/datasets/', { cache: 'no-store' });
    if (!response.ok) {
      el.bagLoader?.classList.remove('hidden');
      return;
    }
    state.indexData = await response.json();
    const datasets = state.indexData.datasets || [];
    if (!datasets.length) {
      el.bagLoader?.classList.remove('hidden');
      return;
    }
    syncDatasetSelect();
    const requestedId = getRequestedDatasetId() || state.indexData.latest || datasets[0].id;
    const selected = datasets.find((item) => item.id === requestedId) || datasets[0];
    el.datasetSelect.value = selected.id;
    await loadManifest(selected.manifest);
  } catch (error) {
    console.error(error);
    el.bagLoader?.classList.remove('hidden');
  }
}

function bindGlobalEvents() {
  el.themeToggleBtn?.addEventListener('click', () => {
    const isHidden = el.themeDockBody?.classList.toggle('hidden');
    const expanded = !isHidden;
    el.themeToggleBtn?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (el.themeToggleIndicator) {
      el.themeToggleIndicator.textContent = expanded ? '收起' : '展开';
    }
  });
  el.odomToggleBtn?.addEventListener('click', () => {
    const isHidden = el.odomPanelBody?.classList.toggle('hidden');
    const expanded = !isHidden;
    el.odomToggleBtn?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (el.odomToggleIndicator) {
      el.odomToggleIndicator.textContent = expanded ? '收起' : '展开';
    }
  });

  el.reloadBtn.addEventListener('click', () => {
    const dataset = (state.indexData?.datasets || []).find((item) => item.id === el.datasetSelect.value);
    if (dataset) loadManifest(dataset.manifest).catch(console.error);
  });

  el.datasetSelect.addEventListener('change', () => {
    const dataset = (state.indexData?.datasets || []).find((item) => item.id === el.datasetSelect.value);
    if (!dataset) return;
    const url = new URL(window.location.href);
    url.searchParams.set('dataset', dataset.id);
    history.replaceState({}, '', url);
    loadManifest(dataset.manifest).catch(console.error);
  });

  el.recordPlaybackBtn?.addEventListener('click', () => {
    if (state.recording.isActive) {
      stopPlaybackRecording();
      return;
    }
    startPlaybackRecording().catch((error) => {
      console.error(error);
      setRecordingStatus(`录制失败：${error?.message || '未知错误'}`, 'error');
      refreshRecordingUi();
    });
  });
  el.downloadMp4Btn?.addEventListener('click', () => {
    downloadMp4FromLastRecording().catch((error) => {
      console.error(error);
      setRecordingStatus(`MP4 转换失败：${error?.message || '未知错误'}`, 'error');
      refreshRecordingUi();
    });
  });

  el.addNumericSeries.addEventListener('click', () => {
    openSeriesEditor(null, 'numeric');
  });

  el.addStringSeries.addEventListener('click', () => {
    if (!getStringTopics().length) return;
    openSeriesEditor(null, 'string');
  });

  const syncDraftAndRender = () => {
    syncSeriesEditorDraftFromForm();
    renderSeriesEditor();
  };
  [
    el.seriesModalLabel,
    el.seriesModalType,
    el.seriesModalColor,
    el.seriesModalTopic,
    el.seriesModalField,
    el.seriesModalStringField,
    el.seriesModalParserMode,
    el.seriesModalCapture,
    el.seriesModalPattern,
    el.seriesModalScale,
  ].forEach((node) => {
    if (!node) return;
    node.addEventListener('change', syncDraftAndRender);
    if (node.tagName === 'INPUT') node.addEventListener('input', syncDraftAndRender);
  });
  el.seriesModalClose?.addEventListener('click', closeSeriesEditor);
  el.seriesModalCancel?.addEventListener('click', closeSeriesEditor);
  el.seriesModalSave?.addEventListener('click', saveSeriesEditor);
  el.seriesModal?.addEventListener('click', (event) => {
    if (event.target === el.seriesModal) closeSeriesEditor();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.seriesEditor.isOpen) closeSeriesEditor();
  });

  el.addSubplot.addEventListener('click', () => {
    const subplot = createSubplot(`坐标组 ${state.subplots.length + 1}`);
    const sources = getGlobalNumericFieldSources();
    if (sources.length >= 2) {
      const usedPairs = new Set(state.subplots.map((item) => `${item.xSeriesId}__${item.ySeriesId}`));
      const nextPair = [];
      for (const source of sources) {
        if (!nextPair.length) {
          nextPair.push(source);
          continue;
        }
        const candidate = `${nextPair[0].key}__${source.key}`;
        if (source.key !== nextPair[0].key && !usedPairs.has(candidate)) {
          nextPair.push(source);
          break;
        }
      }
      if (nextPair[0]) subplot.xSeriesId = nextPair[0].key;
      if (nextPair[1]) subplot.ySeriesId = nextPair[1].key;
    }
    state.subplots.push(subplot);
    renderVisuals();
  });

  el.cleanupSubplots.addEventListener('click', () => {
    if (!state.subplots.length) return;
    state.subplots = [];
    renderVisuals();
  });

  el.layoutPresetSelect?.addEventListener('change', () => {
    state.activeLayoutPresetId = el.layoutPresetSelect.value;
    syncLayoutPresetControls();
    if (!applyDefaultLayoutPreset()) renderVisuals();
  });

  el.saveDefaultLayoutBtn?.addEventListener('click', () => {
    const selectedPreset = getSelectedLayoutPreset();
    const isEditable = selectedPreset && !isReadonlyLayoutPreset(selectedPreset);
    const name = isEditable ? selectedPreset.name : `模板 ${(state.layoutPresets || []).length + 1}`;
    const targetId = isEditable ? selectedPreset.id : '';
    saveDefaultLayoutPreset(name, targetId);
  });

  el.deleteLayoutPresetBtn?.addEventListener('click', () => {
    const preset = getSelectedLayoutPreset();
    if (!preset || isReadonlyLayoutPreset(preset)) return;
    if (!window.confirm(`确认删除模板「${preset.name}」？`)) return;
    deleteSelectedLayoutPreset();
  });

  el.odomTopicSelect.addEventListener('change', () => {
    state.odomConfig.topic = el.odomTopicSelect.value;
    renderVisuals();
  });
  el.transformModeSelect.addEventListener('change', () => {
    state.odomConfig.mode = el.transformModeSelect.value;
    renderVisuals();
  });
  [el.txInput, el.tyInput, el.yawInput].forEach((input) => {
    input.addEventListener('input', () => {
      state.odomConfig.tx = Number(el.txInput.value || 0);
      state.odomConfig.ty = Number(el.tyInput.value || 0);
      state.odomConfig.yawDeg = Number(el.yawInput.value || 0);
      renderVisuals();
    });
  });
  el.odomLocalEnable?.addEventListener('change', () => {
    state.odomConfig.localXYEnabled = el.odomLocalEnable.checked;
    renderVisuals();
  });
  el.odomLocalCoordinateMode?.addEventListener('change', () => {
    applyOdomLocalCoordinateMode(el.odomLocalCoordinateMode.value, {
      preferSuggestedSources: true,
      resetExpressions: true,
    });
    syncOdomControls();
    renderVisuals();
  });
  el.odomLocalXSelect?.addEventListener('change', () => {
    state.odomConfig.localXSourceKey = el.odomLocalXSelect.value;
    if (state.odomConfig.localYSourceKey === state.odomConfig.localXSourceKey) {
      const fallback = getGlobalNumericFieldSources().find((item) => item.key !== state.odomConfig.localXSourceKey)?.key || state.odomConfig.localXSourceKey;
      state.odomConfig.localYSourceKey = fallback;
      if (el.odomLocalYSelect) el.odomLocalYSelect.value = fallback;
    }
    renderVisuals();
  });
  el.odomLocalYSelect?.addEventListener('change', () => {
    state.odomConfig.localYSourceKey = el.odomLocalYSelect.value;
    renderVisuals();
  });
  [el.odomLocalXExpr, el.odomLocalYExpr].forEach((input) => {
    input?.addEventListener('input', () => {
      state.odomConfig.localXExpr = el.odomLocalXExpr?.value || 'x';
      state.odomConfig.localYExpr = el.odomLocalYExpr?.value || 'y';
      renderVisuals();
    });
  });
  el.odomLocalPresetCartesian?.addEventListener('click', () => {
    applyOdomLocalCoordinateMode('xy', {
      preferSuggestedSources: true,
      resetExpressions: true,
    });
    syncOdomControls();
    renderVisuals();
  });
  el.odomLocalPresetPolar?.addEventListener('click', () => {
    applyOdomLocalCoordinateMode('polar', {
      preferSuggestedSources: true,
      resetExpressions: true,
    });
    syncOdomControls();
    renderVisuals();
  });

  // ── Timeline cursor ───────────────────────────────────────────
  el.cursorSlider?.addEventListener('input', () => {
    const ratio = Number(el.cursorSlider.value) / CURSOR_SLIDER_STEPS;
    const t = state.cursor.tMin + ratio * (state.cursor.tMax - state.cursor.tMin);
    setCursor(t, { silent: true });
    renderTimeline();
    renderImageViewer();
    renderPlotPanels(getRenderedSeries());
    drawTrajectory();
    updateCursorMeta();
  });

  el.cursorToStart?.addEventListener('click', () => setCursor(state.cursor.tMin));
  el.cursorToEnd?.addEventListener('click', () => setCursor(state.cursor.tMax));
  document.addEventListener('keydown', (event) => {
    if (state.imageViewer.fullscreenPanelIdx >= 0) return;
    if (state.seriesEditor.isOpen) return;
    if (state.recording.isActive || state.recording.isExporting) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (isEditableEventTarget(event.target)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepCursorByKeyboard(-1, { fast: event.shiftKey });
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepCursorByKeyboard(1, { fast: event.shiftKey });
    }
  });

  let isDraggingTimeline = false;
  const getTimelineT = (e) => {
    const rect = el.timelineCanvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    return state.cursor.tMin + ratio * (state.cursor.tMax - state.cursor.tMin);
  };
  el.timelineCanvas?.addEventListener('mousedown', (e) => {
    isDraggingTimeline = true;
    setCursor(getTimelineT(e), { silent: true });
    renderTimeline();
    renderImageViewer();
    renderPlotPanels(getRenderedSeries());
    drawTrajectory();
    updateCursorMeta();
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDraggingTimeline) return;
    setCursor(getTimelineT(e), { silent: true });
    renderTimeline();
    renderImageViewer();
    renderPlotPanels(getRenderedSeries());
    drawTrajectory();
    updateCursorMeta();
  });
  window.addEventListener('mouseup', () => { isDraggingTimeline = false; });

  // ── Image viewer ──────────────────────────────────────────────
  el.addImagePanelBtn?.addEventListener('click', () => {
    const imageTopics = getImageTopics(true);
    if (!imageTopics.length) return;
    if (state.imageViewer.panels.length >= MAX_IMAGE_PANELS) return;
    const used = new Set(state.imageViewer.panels);
    const next = imageTopics.find((t) => !used.has(t.name));
    if (next) {
      state.imageViewer.panels.push(next.name);
      renderImageViewer();
    }
  });
  el.prevFrameBtn?.addEventListener('click', () => {
    const frames = getPrimaryImageFrames();
    if (!frames.length) return;
    const idx = state.imageViewer.primaryFrameIndex;
    const target = frames[Math.max(0, idx - 1)];
    if (target) setCursor(target.t);
  });
  el.nextFrameBtn?.addEventListener('click', () => {
    const frames = getPrimaryImageFrames();
    if (!frames.length) return;
    const idx = state.imageViewer.primaryFrameIndex;
    const target = frames[Math.min(frames.length - 1, idx + 1)];
    if (target) setCursor(target.t);
  });

  // ── Fullscreen viewer ─────────────────────────────────────────
  el.fullscreenClose?.addEventListener('click', closeFullscreen);
  el.fullscreenPrev?.addEventListener('click', () => fullscreenStep(-1));
  el.fullscreenNext?.addEventListener('click', () => fullscreenStep(1));
  el.fullscreenOverlay?.addEventListener('click', (e) => {
    if (e.target === el.fullscreenOverlay) closeFullscreen();
  });
  document.addEventListener('keydown', (e) => {
    if (state.imageViewer.fullscreenPanelIdx < 0) return;
    if (e.key === 'Escape') closeFullscreen();
    if (e.key === 'ArrowLeft') fullscreenStep(-1);
    if (e.key === 'ArrowRight') fullscreenStep(1);
  });

  // ── Theme controls ────────────────────────────────────────────
  const applyAndSave = () => { applyTheme(); saveTheme(); };
  el.accentColorInput?.addEventListener('input', () => {
    state.theme.accent = el.accentColorInput.value;
    applyAndSave();
  });
  el.bottomTintInput?.addEventListener('input', () => {
    state.theme.bottomTint = el.bottomTintInput.value;
    applyAndSave();
  });
  el.bottomGlowInput?.addEventListener('input', () => {
    state.theme.bottomGlow = Number(el.bottomGlowInput.value);
    applyAndSave();
  });
  el.panelLiftInput?.addEventListener('input', () => {
    state.theme.panelLift = Number(el.panelLiftInput.value);
    applyAndSave();
  });
  el.resetThemeBtn?.addEventListener('click', () => {
    state.theme = { ...THEME_DEFAULTS };
    saveTheme();
    applyTheme();
    syncThemeControls();
  });

  window.addEventListener('resize', () => {
    if (state.manifest) renderVisuals();
  });
}

/**
 * 启动 bag 解析，返回 manifest 路径。
 * @param {string} bagPath
 * @returns {Promise<{cached: boolean, manifestPath: string, datasetId: string}>}
 */
async function loadBag(bagPath) {
  return new Promise((resolve, reject) => {
    // Kick off parse
    let resp;
    try {
      resp = fetch('/parse_bag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bag_path: bagPath }),
      });
    } catch (e) {
      reject(new Error('网络请求失败: ' + e.message));
      return;
    }

    const POLL_INTERVAL = 1500;
    const poll = async () => {
      try {
        const r = await fetch('/progress.json');
        const p = await r.json();

        if (p.status === 'done') {
          el.parseProgress.classList.add('hidden');
          el.parseError.classList.add('hidden');
          resolve({ cached: !!p.already_cached, manifestPath: p.manifest, datasetId: p.dataset_id });
        } else if (p.status === 'error') {
          el.parseProgress.classList.add('hidden');
          el.parseError.classList.remove('hidden');
          el.parseError.textContent = '解析失败: ' + (p.error || '未知错误');
          reject(new Error(p.error || '解析失败'));
        } else {
          // parsing / starting / already_parsing
          const pct = p.pct || 0;
          el.progressBar.style.width = pct + '%';
          if (p.written_frames !== undefined) {
            el.progressText.textContent = `解析中… ${p.written_frames} 帧已写入`;
          } else {
            el.progressText.textContent = p.status === 'already_parsing'
              ? `正在解析: ${p.bag_path}`
              : '正在启动…';
          }
          setTimeout(poll, POLL_INTERVAL);
        }
      } catch (e) {
        el.progressText.textContent = '轮询出错，等待重试…';
        setTimeout(poll, POLL_INTERVAL * 2);
      }
    };

    el.parseProgress.classList.remove('hidden');
    el.parseError.classList.add('hidden');
    el.parseBtn.disabled = true;
    el.progressText.textContent = '正在启动解析…';
    el.progressBar.style.width = '4%';

    resp.then((r) => {
      if (!r.ok) {
        r.json().then((j) => {
          el.parseError.classList.remove('hidden');
          el.parseError.textContent = j.error || '请求失败';
        }).catch(() => {
          el.parseError.classList.remove('hidden');
          el.parseError.textContent = '请求失败 (HTTP ' + r.status + ')';
        });
        el.parseProgress.classList.add('hidden');
        el.parseBtn.disabled = false;
        reject(new Error('HTTP ' + r.status));
        return;
      }
      r.json().then((j) => {
        if (j.status === 'already_parsing') {
          el.progressText.textContent = '已有解析任务在进行中…';
        }
        poll();
      });
    }).catch((e) => {
      el.parseError.classList.remove('hidden');
      el.parseError.textContent = e.message;
      el.parseProgress.classList.add('hidden');
      el.parseBtn.disabled = false;
      reject(e);
    });
  });
}

function bindBagLoaderEvents() {
  el.pickDirBtn?.addEventListener('click', async () => {
    el.pickDirBtn.disabled = true;
    el.parseError.classList.add('hidden');
    try {
      const response = await fetch('/pick_bag_dir', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `目录选择失败 (HTTP ${response.status})`);
      }
      if (!data.path) {
        throw new Error('未返回目录路径');
      }
      el.bagPathInput.value = data.path;
    } catch (error) {
      el.parseError.classList.remove('hidden');
      el.parseError.textContent = error.message || '选择目录失败';
    } finally {
      el.pickDirBtn.disabled = false;
    }
  });

  el.parseBtn?.addEventListener('click', async () => {
    const path = el.bagPathInput?.value?.trim();
    if (!path) {
      el.parseError.classList.remove('hidden');
      el.parseError.textContent = '请输入 bag 目录路径';
      return;
    }
    el.parseError.classList.add('hidden');
    try {
      const result = await loadBag(path);
      el.parseBtn.disabled = false;
      if (result.manifestPath) {
        // Update index to include this dataset
        await refreshDatasetIndex();
        // Switch to the new dataset
        const idx = state.indexData?.datasets?.find((d) => d.id === result.datasetId);
        if (idx) {
          el.datasetSelect.value = idx.id;
          history.replaceState({}, '', location.pathname + '?dataset=' + idx.id);
          await loadManifest(idx.manifest);
        }
      }
    } catch (_) {
      el.parseBtn.disabled = false;
    }
  });

  el.bagPathInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.parseBtn?.click();
  });
}

async function refreshDatasetIndex() {
  try {
    const r = await fetch('/datasets/');
    if (r.ok) {
      const data = await r.json();
      state.indexData = data;
      syncDatasetSelect();
    }
  } catch (_) {}
}

bindGlobalEvents();
bindBagLoaderEvents();
bootstrap();
