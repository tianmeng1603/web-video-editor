# VideoEditor 组件使用文档

## 📖 目录

- [组件概述](#组件概述)
- [快速开始](#快速开始)
- [API 文档](#api文档)
- [项目结构](#项目结构)
- [核心类型](#核心类型)
- [虚拟坐标系统](#虚拟坐标系统)
- [画布比例切换](#画布比例切换)
- [使用示例](#使用示例)
- [快捷键](#快捷键)
- [常见问题](#常见问题)
- [注意事项](#注意事项)
- [技术栈](#技术栈)
- [更新日志](#更新日志)

---

## 组件概述

VideoEditor 是一个功能强大的 React 视频编辑器组件，支持多轨道视频、音频、图片和文本的合成编辑。

### 主要特性

✨ **核心功能**

- 🎬 多轨道时间轴编辑
- 🎥 视频/音频/图片/文本素材支持
- ✂️ 片段裁剪、分割、复制
- 🎨 丰富的样式和特效
- 📤 MP4 视频导出 / PNG 帧导出 / 音频导出（支持多种格式）
- 🖥️ 全屏预览模式（支持实时播放控制）

🛠️ **编辑功能**

- 拖放操作（素材拖入、片段移动）
- 智能吸附（播放头、片段边缘）
- 实时预览
- 全屏预览（无编辑控件，专注观看）
- 撤销/重做（50 步历史记录）
- 自动保存（可配置延迟）

🎯 **高级特性**

- 多画布比例（16:9、9:16、1:1）
  - 支持随时切换比例
  - 自动映射元素位置
  - 尺寸保持不变，布局智能调整
- Web Worker 多线程处理
- FFmpeg.wasm 视频/音频合成
- 国际化支持（中文/英文/日文/繁体中文）
- 自定义字体管理
- 图片裁剪功能

---

## 快速开始

### 安装依赖

```bash
npm install
```

### 基础使用

```tsx
import VideoEditor from "./components/VideoEditor";

function App() {
  return (
    <VideoEditor
      onSave={(projectData) => {
        console.log("项目已保存:", projectData);
      }}
      autoSaveDelay={3000}
      enableAutoSave={true}
    />
  );
}
```

### 加载已有项目

```tsx
import VideoEditor from "./components/VideoEditor";
import { ProjectData } from "./components/VideoEditor/utils/projectData";

function App() {
  const [projectData, setProjectData] = useState<ProjectData | undefined>();

  return (
    <VideoEditor
      initialData={projectData}
      onSave={(data) => {
        // 保存到后端或 IndexedDB
        saveToBackend(data);
      }}
    />
  );
}
```

---

## API 文档

### 组件 Props

#### VideoEditor

**路径**: `src/components/VideoEditor/index.tsx`

VideoEditor 组件接受以下 Props：

#### Props 列表

| Props            | 类型                                                  | 默认值      | 必填 | 说明                 |
| ---------------- | ----------------------------------------------------- | ----------- | ---- | -------------------- |
| `initialData`    | `ProjectData`                                         | `undefined` | 否   | 初始项目数据         |
| `onSave`         | `(projectData: ProjectData) => void \| Promise<void>` | `undefined` | 否   | 保存回调函数         |
| `autoSaveDelay`  | `number`                                              | `3000`      | 否   | 自动保存延迟（毫秒） |
| `enableAutoSave` | `boolean`                                             | `true`      | 否   | 是否启用自动保存     |

---

#### Props 详细说明

### 1. `initialData` - 初始项目数据

**类型**: `ProjectData | undefined`  
**默认值**: `undefined`  
**必填**: 否

**说明**:

用于加载已保存的项目数据，恢复编辑器的完整状态。

**包含内容**:

- 媒体素材列表
- 时间轴片段及其所有属性
- 画布配置（尺寸、比例、背景色）
- 时间轴配置（缩放等级、播放时间）
- 编辑器状态（选中片段、播放状态）

**使用场景**:

- 从后端 API 加载已保存的项目
- 从 IndexedDB 加载本地草稿
- 从 JSON 文件导入项目
- 实现项目列表功能

**注意事项**:

- 如果不提供此参数，编辑器将以空白项目启动
- `ProjectData` 中的媒体素材 URL 需要是有效的可访问路径
- File 对象会丢失，需要通过 URL 重新访问素材
- 加载后会自动初始化历史记录

**示例**:

```tsx
// 从后端加载项目
const [projectData, setProjectData] = useState<ProjectData>();

useEffect(() => {
  fetch("/api/projects/123")
    .then((res) => res.json())
    .then((data) => setProjectData(data));
}, []);

<VideoEditor initialData={projectData} />;
```

---

### 2. `onSave` - 保存回调函数

**类型**: `(projectData: ProjectData) => void | Promise<void>`  
**默认值**: `undefined`  
**必填**: 否

**说明**:

当项目数据发生变化并触发保存时调用此函数。支持同步和异步操作。

**触发时机**:

1. **自动保存**: 数据变化后延迟 `autoSaveDelay` 毫秒触发
2. **手动保存**: 用户按下 `Ctrl+S` / `Cmd+S` 快捷键
3. **导出操作**: 导出 JSON 项目文件时

**回调参数**:

`projectData` - 完整的项目数据对象，包含：

- 所有媒体素材（已序列化）
- 所有时间轴片段
- 画布和时间轴配置
- 编辑器状态

**使用场景**:

- 保存到后端服务器
- 保存到 IndexedDB 或 LocalStorage
- 同步到云存储
- 实现协同编辑功能

**注意事项**:

- 如果不提供此函数，自动保存功能将不生效
- 支持异步操作（返回 Promise）
- 保存失败时建议显示错误提示
- 频繁保存建议使用防抖/节流优化

**示例**:

```tsx
// 保存到后端
const handleSave = async (projectData: ProjectData) => {
  try {
    await fetch("/api/projects/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });
    message.success("保存成功");
  } catch (error) {
    message.error("保存失败");
    console.error(error);
  }
};

<VideoEditor onSave={handleSave} />;
```

```tsx
// 保存到 IndexedDB
const saveToIndexedDB = async (data: ProjectData) => {
  const db = await openDB("VideoEditorDB", 1, {
    upgrade(db) {
      db.createObjectStore("projects");
    },
  });
  await db.put("projects", data, "draft");
  console.log("已保存到本地");
};

<VideoEditor onSave={saveToIndexedDB} />;
```

---

### 3. `autoSaveDelay` - 自动保存延迟

**类型**: `number`  
**默认值**: `3000`（3 秒）  
**必填**: 否  
**单位**: 毫秒（ms）

**说明**:

设置自动保存的防抖延迟时间。当用户停止编辑操作后，等待指定时间后才触发保存。

**工作原理**:

1. 用户进行编辑操作（添加片段、修改属性等）
2. 启动计时器，倒计时 `autoSaveDelay` 毫秒
3. 如果在倒计时期间再次编辑，重置计时器
4. 倒计时结束后，调用 `onSave` 函数保存

**推荐值**:

- **快速保存**: `1000-2000ms` - 适合小型项目，数据丢失风险低
- **标准保存**: `3000-5000ms` - 平衡性能和安全性（推荐）
- **慢速保存**: `5000-10000ms` - 适合大型项目，减少服务器压力

**使用场景**:

- 根据项目复杂度调整延迟时间
- 网络较慢时增加延迟，避免频繁请求
- 性能较低的设备可以增加延迟

**注意事项**:

- 设置过短可能导致频繁保存，影响性能
- 设置过长可能导致数据丢失风险增加
- Worker 模式下延迟时间影响较小

**示例**:

```tsx
// 快速自动保存（2秒）
<VideoEditor autoSaveDelay={2000} />

// 慢速自动保存（10秒）- 适合大型项目
<VideoEditor autoSaveDelay={10000} />
```

---

### 4. `enableAutoSave` - 启用自动保存

**类型**: `boolean`  
**默认值**: `true`  
**必填**: 否

**说明**:

控制是否启用自动保存功能。

**功能影响**:

- `true`: 启用自动保存，数据变化后自动调用 `onSave`
- `false`: 禁用自动保存，只支持手动保存（Ctrl+S）

**使用场景**:

- **启用（true）**:
  - 普通编辑场景（推荐）
  - 云端项目编辑
  - 需要防止数据丢失
- **禁用（false）**:
  - 临时试用/演示模式
  - 没有配置 `onSave` 函数
  - 需要完全手动控制保存时机
  - 离线编辑模式

**注意事项**:

- 禁用后仍然可以通过快捷键（Ctrl+S）手动保存
- 禁用自动保存不影响历史记录功能（撤销/重做）
- 建议始终启用自动保存，避免数据丢失

**示例**:

```tsx
// 禁用自动保存，只支持手动保存
<VideoEditor
  enableAutoSave={false}
  onSave={(data) => {
    console.log('用户手动保存:', data);
  }}
/>

// 根据条件动态启用/禁用
const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

<VideoEditor
  enableAutoSave={autoSaveEnabled}
  onSave={handleSave}
/>

<button onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}>
  {autoSaveEnabled ? '禁用自动保存' : '启用自动保存'}
</button>
```

---

### Props 组合使用

#### 场景 1: 新建项目（最简单）

```tsx
<VideoEditor />
```

- 以空白项目启动
- 启用默认的自动保存（3 秒延迟）
- 不会触发 `onSave`（因为未提供）

#### 场景 2: 新建项目 + 自动保存

```tsx
<VideoEditor
  onSave={(data) => saveToServer(data)}
  autoSaveDelay={3000}
  enableAutoSave={true}
/>
```

- 以空白项目启动
- 用户编辑后自动保存到服务器
- 3 秒延迟防抖

#### 场景 3: 加载已有项目 + 自动保存

```tsx
<VideoEditor
  initialData={loadedProject}
  onSave={(data) => updateToServer(data)}
  autoSaveDelay={5000}
/>
```

- 加载已有项目数据
- 编辑后自动更新到服务器
- 5 秒延迟

#### 场景 4: 演示模式（禁用自动保存）

```tsx
<VideoEditor enableAutoSave={false} />
```

- 以空白项目启动
- 禁用自动保存
- 用户可以通过 Ctrl+S 手动保存（但不会触发回调）

#### 场景 5: 完整配置

```tsx
<VideoEditor
  initialData={projectData}
  onSave={async (data) => {
    // 保存到多个位置
    await Promise.all([saveToServer(data), saveToIndexedDB(data)]);
  }}
  autoSaveDelay={4000}
  enableAutoSave={true}
/>
```

- 加载已有项目
- 同时保存到服务器和本地
- 4 秒延迟自动保存

---

## 项目结构

### 📁 目录结构

```
src/components/VideoEditor/
├── index.tsx                    # 主入口组件
├── types.ts                     # TypeScript 类型定义
│
├── Header/                      # 顶部栏
│   └── TopBar.tsx              # 顶部工具栏（标题、导出、语言切换等）
│
├── Controls/                    # 播放控制相关
│   ├── PlaybackControls.tsx    # 播放控制栏（播放/暂停/时间/全屏）
│   └── ExportPanel.tsx          # 导出面板（视频/音频/图片/项目）
│
├── Preview/                     # 预览画布相关
│   ├── PreviewCanvas.tsx        # 主预览画布（支持普通和全屏模式）
│   ├── FullscreenPreview.tsx    # 全屏预览模态框（含播放控制和画布）
│   ├── MediaElement.tsx         # 媒体元素渲染（视频/图片/文本）
│   ├── MoveableControl.tsx      # 可移动控制框（拖动/缩放/旋转）
│   └── ZoomPanWrapper.tsx       # 画布缩放和平移控制（支持禁用）
│
├── Timeline/                    # 时间轴相关
│   ├── TimelineEditor.tsx       # 时间轴编辑器主组件
│   ├── TimelineScale.tsx        # 时间刻度尺
│   ├── DroppableTrackRow.tsx    # 可拖放的轨道行
│   ├── DraggableClipItem.tsx    # 可拖动的片段项
│   └── PlaybackCursor.tsx       # 播放头游标
│
├── Sidebar/                     # 左侧边栏
│   ├── LeftPanel.tsx            # 左侧面板容器
│   ├── Toolbar.tsx              # 工具栏（媒体库/文本/音频）
│   ├── MediaLibrary.tsx         # 媒体库（显示已上传素材）
│   └── MediaUploader.tsx        # 媒体上传组件
│
├── RightPanel/                  # 右侧属性面板
│   ├── RightPanel.tsx           # 右侧面板容器
│   ├── TextStylePanel.tsx       # 文本样式编辑面板
│   ├── ImageStylePanel.tsx      # 图片样式编辑面板
│   ├── VideoStylePanel.tsx      # 视频样式编辑面板
│   ├── AudioStylePanel.tsx      # 音频属性编辑面板
│   ├── FontSelector.tsx         # 字体选择器
│   └── CropModal.tsx            # 图片裁剪弹窗
│
├── common/                      # 公共组件
│   ├── ExportProgressModal.tsx  # 导出进度弹窗
│   └── LoadingDots.tsx          # 加载动画组件
│
├── hooks/                       # 自定义 Hooks
│   ├── useProjectState.ts       # 项目状态管理
│   ├── useHistoryOperations.ts  # 历史记录操作（撤销/重做）
│   ├── useClipOperations.ts     # 片段操作
│   ├── usePlaybackControl.ts    # 播放控制
│   ├── useExport.ts             # 导出功能
│   ├── useAutoSave.ts           # 自动保存
│   ├── useAutoSaveWithWorker.ts # Worker版自动保存
│   ├── useInitialData.ts        # 初始数据加载
│   ├── useTimelineScale.ts      # 时间轴缩放
│   ├── useTimelineSnap.ts       # 时间轴吸附
│   └── useTrackData.ts          # 轨道数据管理
│
└── utils/                       # 工具函数
    ├── projectData.ts           # 项目数据序列化
    ├── HistoryManager.ts        # 历史记录管理器
    ├── mediaProcessor.ts        # 媒体处理（封面生成、时长获取）
    ├── timelineUtils.ts         # 时间轴工具函数
    ├── canvasCoordinates.ts     # 画布坐标系统管理（核心）
    ├── ffmpegExporter.ts        # FFmpeg视频导出
    ├── audioExporter.ts         # 音频导出（支持多种格式）
    ├── etroExporter.ts          # 帧图片导出
    ├── fontDetector.ts          # 字体管理器
    ├── autoSaveWorker.ts        # 自动保存Worker
    └── Scrollbar.tsx            # 自定义滚动条组件
```

---

## 文件详细说明

### 📄 核心组件

#### `index.tsx` - 主入口组件

**路径**: `src/components/VideoEditor/index.tsx`

**作用**:

- 整合所有子组件和功能模块
- 管理全局状态（clips、mediaItems、播放状态等）
- 协调各个模块之间的通信
- 提供统一的 API 接口

**使用的 Hooks**:

- `useProjectState` - 状态管理
- `useHistoryOperations` - 撤销/重做
- `useClipOperations` - 片段操作
- `useExport` - 导出功能
- `usePlaybackControl` - 播放控制
- `useInitialData` - 数据加载
- `useAutoSave` - 自动保存

---

### 📄 类型定义

#### `types.ts` - TypeScript 类型定义

**路径**: `src/components/VideoEditor/types.ts`

**主要类型**:

- `MediaItem` - 媒体素材数据结构
- `TimelineClip` - 时间轴片段数据结构
- 各种样式和配置类型

---

### 🎯 Header (顶部栏)

#### `TopBar.tsx` - 顶部工具栏

**作用**:

- 显示项目标题
- 导出按钮（视频/音频/图片/项目）
- 语言切换按钮
- 撤销/重做按钮
- 项目管理功能

---

### 🎮 Controls (播放控制)

#### `PlaybackControls.tsx` - 播放控制栏

**作用**:

- 播放/暂停按钮
- 时间轴缩放控制（10 档缩放）
- 显示当前时间和总时长
- 全屏预览按钮
- 提供播放进度控制

#### `ExportPanel.tsx` - 导出面板

**作用**:

- 导出 MP4 视频
- 导出音频（MP3/WAV/AAC/FLAC 等）
- 导出 PNG 图片
- 保存项目为 JSON
- 配置导出参数

---

### 🖼️ Preview (预览画布)

#### `PreviewCanvas.tsx` - 主预览画布

**作用**:

- 实时渲染所有可见片段
- 显示合成后的视频效果
- 支持画布缩放和平移（非全屏模式）
- 显示编辑控制框（非全屏模式）
- 支持全屏模式（通过 `isFullscreen` prop）
- 全屏模式下自动隐藏编辑控件，禁用缩放拖拽
- 自动适配画布比例（16:9、9:16、1:1）

**全屏模式特性**:

- 通过 `display: flex/none` 在普通和全屏模式间切换，避免重新挂载
- 使用 `ResizeObserver` 持续监听容器尺寸变化
- 画布居中显示，保持正确宽高比
- 黑色背景（#262626），沉浸式体验

#### `FullscreenPreview.tsx` - 全屏预览模态框

**作用**:

- 全屏模态框容器
- 内嵌 `PreviewCanvas` 组件（设置 `isFullscreen={true}`）
- 底部播放控制条（播放/暂停、进度条、时间显示）
- 顶部右侧关闭按钮
- 键盘 ESC 快捷退出
- 支持进度条拖动跳转
- 退出全屏时自动调用浏览器的 `exitFullscreen()`

**设计理念**:

- 画布始终渲染（通过 `display` 控制显示/隐藏）
- 避免进入全屏时重新加载画布
- 确保尺寸更新和画面流畅切换

#### `MediaElement.tsx` - 媒体元素渲染

**作用**:

- 渲染单个媒体片段（视频/图片/文本）
- 应用样式和变换效果
- 处理视频播放和裁剪
- 支持全屏模式（通过 `isFullscreenMode` prop）
- 文本元素高度自适应（支持换行后删除文字高度回缩）

#### `MoveableControl.tsx` - 可移动控制框

**作用**:

- 选中片段时显示控制框
- 支持拖动、缩放、旋转
- 实时更新片段位置和尺寸

#### `ZoomPanWrapper.tsx` - 画布缩放平移

**作用**:

- 画布缩放功能（滚轮缩放）
- 画布平移功能（鼠标拖动）
- 适配不同画布比例
- 支持禁用模式（`disabled` prop）

**禁用模式行为**:

- 全屏模式下自动禁用缩放和拖拽功能
- 内容容器宽高从 `fit-content` 切换为 `100%`
- 配合 PreviewCanvas 的 `flex items-center justify-center` 实现画布居中
- 确保全屏时画布正确居中显示

---

### ⏱️ Timeline (时间轴)

#### `TimelineEditor.tsx` - 时间轴编辑器

**作用**:

- 时间轴主组件
- 管理片段的拖放和排列
- 轨道插入和重映射
- 智能吸附功能

#### `TimelineScale.tsx` - 时间刻度尺

**作用**:

- 显示时间刻度
- 支持 10 档缩放（60 秒/刻度 ~ 1 秒/刻度）
- 点击定位播放头

#### `DroppableTrackRow.tsx` - 可拖放轨道行

**作用**:

- 单个轨道的渲染
- 作为片段的拖放目标区域

#### `DraggableClipItem.tsx` - 可拖动片段项

**作用**:

- 单个片段的时间轴表示
- 支持拖动移动
- 支持边缘调整（裁剪时长）
- 显示片段缩略图和名称

#### `PlaybackCursor.tsx` - 播放头游标

**作用**:

- 显示当前播放位置
- 支持拖动跳转
- 吸附到片段边缘

---

### 📂 Sidebar (侧边栏)

#### `LeftPanel.tsx` - 左侧面板容器

**作用**:

- 管理左侧面板的显示和切换
- 包含工具栏和内容区域

#### `Toolbar.tsx` - 工具栏

**作用**:

- 媒体库按钮
- 添加文本按钮
- 添加音频按钮

#### `MediaLibrary.tsx` - 媒体库

**作用**:

- 显示所有已上传的媒体素材
- 支持拖动素材到时间轴
- 素材删除功能

#### `MediaUploader.tsx` - 媒体上传

**作用**:

- 文件上传（视频、音频、图片）
- 文件格式验证
- 生成缩略图和波形图

---

### 🎨 RightPanel (属性面板)

#### `RightPanel.tsx` - 右侧面板容器

**作用**:

- 根据选中片段类型显示对应的编辑面板
- 无选中时显示画布设置

#### `TextStylePanel.tsx` - 文本样式面板

**作用**:

- 文本内容编辑
- 字体、字号、颜色设置
- 对齐、装饰、变换设置
- 描边、阴影效果

#### `ImageStylePanel.tsx` - 图片样式面板

**作用**:

- 图片裁剪
- 圆角、边框、阴影
- 滤镜效果（亮度、模糊）

#### `VideoStylePanel.tsx` - 视频样式面板

**作用**:

- 视频裁剪（trimStart/trimEnd）
- 音量控制
- 播放速度调整
- 样式效果（同图片）

#### `AudioStylePanel.tsx` - 音频属性面板

**作用**:

- 音量控制
- 播放速度调整
- 音频裁剪

#### `FontSelector.tsx` - 字体选择器

**作用**:

- 字体列表展示
- 字重选择
- 字体预览

#### `CropModal.tsx` - 裁剪弹窗

**作用**:

- 图片裁剪功能
- 支持自由裁剪和形状裁剪
- 实时预览裁剪效果

---

### 🧩 Common (公共组件)

#### `ExportProgressModal.tsx` - 导出进度弹窗

**作用**:

- 显示导出进度条
- 显示当前导出状态
- 支持取消导出
- 导出完成提示

#### `LoadingDots.tsx` - 加载动画组件

**作用**:

- 显示加载动画（三个点）
- 用于等待状态提示

---

### 🔧 Hooks (自定义 Hooks)

所有 Hooks 位于 `src/components/VideoEditor/hooks/`

#### `useProjectState.ts`

**作用**: 集中管理所有项目状态

- 媒体素材列表（mediaItems）
- 时间轴片段列表（clips）
- 播放状态（currentTime, isPlaying, scale）
- UI 状态（selectedClipId, activePanel, canvasRatio）
- Refs（forceUpdateTextRef, isUndoRedoInProgress）

#### `useHistoryOperations.ts`

**作用**: 历史记录操作

- 撤销（Undo）
- 重做（Redo）
- 保存到历史记录
- 历史状态管理

#### `useClipOperations.ts`

**作用**: 片段和素材操作

- 添加/删除媒体素材
- 添加片段到时间轴
- 更新片段属性
- 批量更新片段
- 片段分割、复制、删除
- 轨道重映射

#### `usePlaybackControl.ts`

**作用**: 播放控制

- 播放/暂停切换
- 时间更新（60fps）
- 播放到末尾自动停止
- 全屏预览控制

#### `useExport.ts`

**作用**: 导出和项目管理

- 导出 MP4 视频
- 导出音频（多种格式）
- 导出 PNG 图片
- 保存项目为 JSON
- 加载项目
- 下载导出的文件

#### `useAutoSave.ts`

**作用**: 自动保存（主线程版本）

- 数据变化检测
- 防抖延迟保存
- Ctrl+S 快捷键保存

#### `useAutoSaveWithWorker.ts`

**作用**: 自动保存（Worker 版本）

- 使用 Web Worker 多线程处理
- 不阻塞主线程
- 自动降级到主线程模式

#### `useInitialData.ts`

**作用**: 初始数据加载

- 加载项目数据
- 恢复编辑器状态
- 异步处理媒体数据
- 初始化历史记录

#### `useTimelineScale.ts`

**作用**: 时间轴缩放

- 计算缩放参数
- 像素和时间的转换

#### `useTimelineSnap.ts`

**作用**: 时间轴吸附

- 拖动时智能吸附
- 吸附到播放头和片段边缘
- 吸附线显示

#### `useTrackData.ts`

**作用**: 轨道数据管理

- 按轨道分组片段
- 过滤空轨道
- 轨道索引重映射

---

### 🛠️ Utils (工具函数)

所有工具函数位于 `src/components/VideoEditor/utils/`

#### `projectData.ts`

**主要函数**:

- `generateProjectData()` - 生成项目数据
- `loadProjectData()` - 加载项目数据
- `exportProjectAsJSON()` - 导出为 JSON 文件
- `importProjectFromJSON()` - 从 JSON 文件导入
- `serializeMediaItem()` - 序列化媒体素材
- `deserializeMediaItem()` - 反序列化媒体素材

**作用**: 项目数据的序列化和反序列化，支持保存和加载

#### `HistoryManager.ts`

**主要方法**:

- `push()` - 保存状态到历史栈
- `undo()` - 撤销操作
- `redo()` - 重做操作
- `clear()` - 清空历史记录
- `getInfo()` - 获取历史信息

**作用**: 管理撤销/重做功能的历史记录栈

#### `mediaProcessor.ts`

**主要函数**:

- `generateVideoThumbnail()` - 生成视频封面
- `getAudioDuration()` - 获取音频时长
- `getImageDimensions()` - 获取图片尺寸

**作用**: 处理媒体资源的元数据获取

#### `timelineUtils.ts`

**主要函数**:

- `checkCollision()` - 检查片段碰撞
- `snapToPosition()` - 智能吸附位置计算

**作用**: 时间轴相关的工具函数

#### `canvasCoordinates.ts` ⭐ 核心模块

**路径**: `src/components/VideoEditor/utils/canvasCoordinates.ts`

**主要函数**:

```typescript
// 获取虚拟坐标系统的基准尺寸
export const getBaseCanvasSize = (canvasRatio: string): { width: number; height: number }

// 计算从虚拟坐标系到目标尺寸的缩放比例
export const getScaleFactor = (canvasRatio: string, targetWidth: number, targetHeight: number): number
```

**作用**:

这是 VideoEditor 最核心的工具模块之一，定义了整个应用的坐标系统标准。

**虚拟坐标系统定义**:

- **16:9 横屏**: 1920 x 1080（长边 1920）
- **9:16 竖屏**: 1080 x 1920（长边 1920）
- **1:1 方屏**: 1080 x 1080（统一短边 1080）

**设计理念**:

1. **统一坐标基准** - 所有元素坐标（x, y, width, height）都基于虚拟坐标系统存储
2. **按需缩放** - 预览、编辑、导出时按比例缩放到实际/目标尺寸
3. **一致性保证** - 确保整个应用（预览、导出、保存）使用相同的坐标基准

**使用场景**:

| 场景           | 用途                     | 说明                                 |
| -------------- | ------------------------ | ------------------------------------ |
| PreviewCanvas  | 预览和编辑时的虚拟画布   | 将虚拟坐标缩放到实际显示尺寸         |
| ffmpegExporter | 视频导出时的基准坐标     | 根据画布比例获取对应的虚拟尺寸       |
| etroExporter   | 图片导出时的基准坐标     | 导出时使用虚拟坐标系统保证一致性     |
| projectData    | 项目保存时的画布尺寸     | 保存元素坐标时使用虚拟坐标系统       |
| index.tsx      | 画布比例切换时的尺寸计算 | 切换时计算新旧画布尺寸，映射元素位置 |

**示例**:

```typescript
// 获取16:9画布的虚拟尺寸
const size = getBaseCanvasSize("16:9");
// 返回: { width: 1920, height: 1080 }

// 计算导出1080P时的缩放比例
const scale = getScaleFactor("16:9", 1920, 1080);
// 返回: 1.0 (无需缩放)

// 计算导出2K时的缩放比例
const scale2K = getScaleFactor("16:9", 2560, 1440);
// 返回: 1.333... (放大1.33倍)

// 元素坐标基于虚拟尺寸
const element = { x: 500, y: 400, width: 200, height: 150 };
// 导出时缩放
const exportX = element.x * scale2K; // 666.67
```

**为什么需要虚拟坐标系统？**

1. **跨比例一致性** - 不同比例使用各自的虚拟尺寸，避免坐标混乱
2. **导出质量** - 导出时可以任意分辨率，坐标自动缩放
3. **编辑便利** - 开发者和用户不需要关心实际显示尺寸
4. **项目兼容** - 保存的项目在任何设备上都能正确显示

#### `ffmpegExporter.ts`

**主要函数**:

- `exportAsMP4()` - 导出 MP4 视频

**作用**:

- 使用 FFmpeg.wasm 合成视频
- 支持多轨道、音频混合
- 实时进度反馈
- **自动适配画布比例的虚拟坐标系统**
- 根据 `canvasRatio` 使用对应的基准尺寸（16:9=1920x1080, 9:16=1080x1920, 1:1=1080x1080）
- **智能码率计算**：基于 BPP（Bits Per Pixel）算法，考虑像素数、帧率和编码器效率

**导出选项**:

```ts
interface ExportOptions {
  resolution?: string; // 输出分辨率（如"1920x1080"），默认根据画布比例自动计算
  frameRate?: number; // 帧率（fps），默认30
  bitrate?: string; // 视频质量档位："lower"、"recommended"（推荐）、"higher"、或自定义（如"5M"）
  bitrateMode?: string; // 比特率模式（"cbr"固定或"vbr"可变），默认"cbr"
  codec?: string; // 视频编码器（如"libx264"、"libx265"、"libaom-av1"），默认"libx264"
  audioSampleRate?: number; // 音频采样率（Hz），默认44100
  audioQuality?: string; // 音频质量（如"aac_192"、"aac_256"、"pcm"），默认"aac_192"
  format?: string; // 输出格式（"MP4"或"MOV"），默认"MP4"
}
```

**智能码率计算**:

导出器使用专业的 **BPP（Bits Per Pixel）算法**计算最优码率：

```typescript
码率 = 像素数 × 帧率 × BPP系数 × 编码器效率
```

| 质量档位        | BPP 系数 | 说明                      | 1080P@30fps 参考码率 |
| --------------- | -------- | ------------------------- | -------------------- |
| **lower**       | 0.07     | 低质量，适合快速分享      | ~4.3M                |
| **recommended** | 0.12     | 推荐质量，YouTube 标准 ⭐ | ~7.5M                |
| **higher**      | 0.20     | 高质量，专业归档          | ~12.4M               |

**编码器效率调整**:

| 编码器     | 效率系数 | 说明                             |
| ---------- | -------- | -------------------------------- |
| H.264      | 1.0      | 基准编码器，兼容性最好           |
| H.265/HEVC | 0.6      | 效率提升 40%，相同质量用更低码率 |
| AV1        | 0.5      | 效率提升 50%，文件最小但编码较慢 |

**优势**:

- ✅ 自动适配任意分辨率和帧率
- ✅ 考虑编码器效率（H.265 自动降低码率）
- ✅ 精确的线性计算，避免阶梯式误差
- ✅ 符合 YouTube/Netflix 行业标准

#### `audioExporter.ts`

**主要函数**:

- `exportAudio()` - 导出音频文件

**参数**:

```typescript
interface AudioExportOptions {
  format: string; // 音频格式
  bitrate: string; // 比特率 (kbps)
  sampleRate: number; // 采样率 (Hz)
}
```

**作用**:

- 使用 FFmpeg.wasm 在浏览器中导出音频
- 合成视频中的音频轨道
- 合成所有音频片段
- 支持音频裁剪和时间偏移
- 实时进度反馈

**支持的音频格式**:

- **MP3** - 最常用，较好的压缩率（默认）
- **WAV** - 无损，文件较大
- **AAC** - 高质量，较小文件
- **FLAC** - 无损压缩
- **AIFF** - Apple 音频格式
- **OGG** - 开源压缩格式

**导出流程**:

1. 加载所有音频源（视频音频 + 纯音频）
2. 创建项目时长的静音基底
3. 使用 FFmpeg 滤镜链处理每个音频片段
   - 裁剪（trimStart/trimEnd）
   - 时间偏移（clip.start）
   - 音量调整（clip.volume）
4. 混合所有音频轨道
5. 编码为目标格式并输出

**推荐配置**:

| 用途       | 格式 | 比特率 | 采样率 | 说明                 |
| ---------- | ---- | ------ | ------ | -------------------- |
| 高质量     | MP3  | 320k   | 48000  | 接近无损，文件较大   |
| 标准质量   | MP3  | 192k   | 44100  | 最佳平衡（推荐）     |
| 播客/语音  | MP3  | 128k   | 44100  | 适合人声             |
| 无损存档   | FLAC | -      | 48000  | 无损压缩，文件较大   |
| 兼容性最佳 | AAC  | 192k   | 44100  | 现代设备支持好       |
| 快速预览   | WAV  | -      | 44100  | 无需编码，但文件巨大 |

**注意事项**:

- 首次使用需要下载 FFmpeg.wasm（约 30MB）
- 导出时间取决于项目长度和音频数量
- 使用音频滤镜链确保准确的时间对齐
- 自动创建静音基底填充空白时间
- 支持多音频轨道混合

#### `etroExporter.ts`

**主要函数**:

- `exportFrameAsPNG()` - 导出当前帧为 PNG/JPG

**作用**:

- 基于 Canvas 渲染当前帧
- 支持所有样式和效果
- 导出为 PNG 或 JPG 图片
- **自动适配画布比例的虚拟坐标系统**
- 根据 `canvasRatio` 使用对应的基准尺寸（16:9=1920x1080, 9:16=1080x1920, 1:1=1080x1080）
- 支持自定义导出分辨率

#### `canvasCoordinates.ts`

**主要函数**:

- `getBaseCanvasSize(canvasRatio)` - 获取虚拟坐标系统的基准尺寸
- `getScaleFactor(canvasRatio, targetWidth, targetHeight)` - 计算缩放比例

**作用**:

- **核心坐标系统管理** - 统一整个应用的坐标系统标准
- 定义不同画布比例的虚拟尺寸：
  - 16:9 横屏：1920 x 1080
  - 9:16 竖屏：1080 x 1920
  - 1:1 方屏：1080 x 1080
- 所有元素坐标都基于此虚拟坐标系统存储
- 预览、编辑、导出时按比例缩放到目标尺寸
- 确保整个应用使用相同的坐标基准

**使用场景**:

- PreviewCanvas：预览和编辑时的虚拟画布
- ffmpegExporter：视频导出时的基准坐标
- etroExporter：图片导出时的基准坐标
- projectData：项目保存时的画布尺寸

#### `fontDetector.ts`

**主要函数**:

- `fontManager` - 字体管理器对象（函数式实现）
  - `initialize(config)` - 初始化字体管理器
  - `getFontList()` - 获取所有字体列表
  - `getFontChildren(family)` - 获取指定字体的子项列表
  - `getFontFamilyName(family, childDisplayName?)` - 获取完整的字体 family 名称
  - `getBaseFontFamily(fontFamily)` - 从完整的 family 名称提取基础字体名
  - `getChildDisplayName(fontFamily)` - 从完整的 family 名称提取子项显示名

**使用的技术**:

- **fontfaceobserver** - 监听字体加载状态（15 秒超时）
- **@font-face** - 动态创建字体规则
- **闭包** - 管理模块状态（fonts, isInitialized）

**作用**:

- 管理和加载字体资源
- 支持多子项字体（Light, Regular, Bold 等）
- 确保字体加载完成后再使用
- 提供字体名称转换和解析工具函数

#### `autoSaveWorker.ts`

**主要函数**:

- `createAutoSaveWorker()` - 创建 Worker 实例
- `generateDataSnapshot()` - 生成数据快照（主线程备用）
- `prepareProjectSaveData()` - 准备保存数据（主线程备用）

**作用**: Web Worker 多线程处理，优化大型项目性能

#### `Scrollbar.tsx`

**作用**: 自定义滚动条组件，用于时间轴

---

## 核心类型

### MediaItem - 媒体素材

```typescript
interface MediaItem {
  id: string; // 唯一标识
  name: string; // 素材名称
  type: "video" | "audio" | "image" | "text";
  url: string; // 素材URL（本地或服务器）
  file: File; // 原始文件对象
  duration?: number; // 时长（秒），视频和音频有此属性
  thumbnail?: string; // 缩略图（base64）
  waveform?: string; // 音频波形图（base64）
  width?: number; // 原始宽度
  height?: number; // 原始高度
}
```

### TimelineClip - 时间轴片段

```typescript
interface TimelineClip {
  // 基本属性
  id: string; // 唯一标识
  mediaId: string; // 关联的媒体素材ID
  type?: "video" | "audio" | "image" | "text"; // 片段类型（便于快速访问，无需查找 MediaItem）
  start: number; // 时间轴上的开始时间（秒）
  end: number; // 时间轴上的结束时间（秒）
  trackIndex: number; // 轨道索引（0为最底层）

  // 时间裁剪（视频/音频）
  trimStart?: number; // 素材裁剪开始时间
  trimEnd?: number; // 素材裁剪结束时间

  // 画布属性（位置和变换）
  x?: number; // X坐标（基于1920x1080标准）
  y?: number; // Y坐标
  width?: number; // 宽度
  height?: number; // 高度
  rotation?: number; // 旋转角度（度）
  scale?: number; // 缩放比例
  opacity?: number; // 不透明度（0-100）

  // 文本属性
  text?: string; // 文本内容
  textStyle?: {
    // 文本样式
    fontFamily?: string;
    fontWeight?: string;
    fontSize?: number;
    color?: string;
    textAlign?: string;
    textDecoration?: string;
    textTransform?: string;
    strokeColor?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowBlur?: number;
  };

  // 图片/视频样式
  mediaStyle?: {
    borderRadius?: number;
    brightness?: number; // 0-200
    blur?: number; // 0-100
    outlineColor?: string;
    outlineWidth?: number;
    shadowColor?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowBlur?: number;
  };

  // 裁剪区域
  cropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: "px";
    path?: string; // SVG裁剪路径
  };

  // 音频/视频属性
  volume?: number; // 音量（0-200）
  speed?: number; // 播放速度（0.25-4）
}
```

### FontChild - 字体子项

```typescript
interface FontChild {
  family: string; // 完整的 font-family 名称（如 "Microsoft YaHei Bold"）
  displayName: string; // 显示名称（如 "Bold"）
  url: string; // 字体文件 URL（如 "/fonts/MicrosoftYahei/MSYHBD.TTC"）
}
```

### FontFamily - 字体家族

```typescript
interface FontFamily {
  family: string; // 基础字体名称（如 "Microsoft YaHei"）
  displayName: string; // 显示名称（如 "微软雅黑"）
  children: FontChild[]; // 字体子项列表（Light, Regular, Bold 等）
  url?: string; // 单字体文件 URL（如果没有子项）
}
```

### ProjectData - 项目数据

```typescript
interface ProjectData {
  version: string; // 版本号
  projectName: string; // 项目名称
  createdAt: string; // 创建时间（ISO格式）
  updatedAt: string; // 更新时间（ISO格式）

  mediaItems: SerializableMediaItem[]; // 序列化的素材
  clips: TimelineClip[]; // 时间轴片段

  canvas: {
    width: number; // 画布宽度
    height: number; // 画布高度
    backgroundColor: string; // 背景色
    ratio: string; // 比例（"16:9" | "9:16" | "1:1"）
  };

  timeline: {
    scale: number; // 缩放等级（1-10）
    currentTime: number; // 当前时间
    duration: number; // 总时长
  };

  editor: {
    selectedClipId: string | null; // 选中片段ID
    playState: "playing" | "paused"; // 播放状态
  };
}
```

---

## 虚拟坐标系统

### 核心概念

VideoEditor 使用**虚拟坐标系统**来统一管理所有元素的位置和尺寸，这是整个应用的核心设计理念之一。

### 什么是虚拟坐标系统？

虚拟坐标系统是一个抽象的坐标空间，所有元素的坐标（`x`, `y`, `width`, `height`）都基于这个虚拟空间存储，而不是基于实际的屏幕像素。

**不同画布比例有不同的虚拟尺寸**：

| 画布比例 | 虚拟尺寸    | 适用场景              |
| -------- | ----------- | --------------------- |
| 16:9     | 1920 x 1080 | YouTube、Bilibili     |
| 9:16     | 1080 x 1920 | TikTok、抖音、快手    |
| 1:1      | 1080 x 1080 | Instagram、微信朋友圈 |

### 为什么需要虚拟坐标系统？

#### 1. 跨比例一致性

不同画布比例使用各自的虚拟尺寸，避免坐标混乱：

```typescript
// 16:9 画布中心的元素
const element169 = { x: 960, y: 540, width: 200, height: 100 };
// 保存后切换到 9:16，会自动映射到新画布中心
// 新位置：x: 540, y: 960（相对位置保持中心）
```

#### 2. 导出质量灵活性

导出时可以任意分辨率，坐标自动缩放：

```typescript
// 虚拟坐标系统：1920x1080
const element = { x: 500, y: 400, width: 200, height: 150 };

// 导出 1080P
const scale1080 = 1920 / 1920; // 1.0
const export1080X = element.x * scale1080; // 500

// 导出 4K (3840x2160)
const scale4K = 3840 / 1920; // 2.0
const export4KX = element.x * scale4K; // 1000
```

#### 3. 编辑便利性

开发者和用户不需要关心实际显示尺寸：

- 编辑器窗口可以任意大小
- 预览画布自动缩放
- 元素位置始终基于虚拟坐标

#### 4. 项目兼容性

保存的项目在任何设备上都能正确显示：

- 手机、平板、桌面显示效果一致
- 不同屏幕分辨率自动适配
- 项目数据与显示设备解耦

### 工作原理

#### 预览和编辑

```typescript
// 1. 获取虚拟画布尺寸
const baseSize = getBaseCanvasSize("16:9"); // { width: 1920, height: 1080 }

// 2. 计算实际显示尺寸的缩放比例
const containerWidth = 800; // 实际容器宽度
const scale = containerWidth / baseSize.width; // 0.417

// 3. 渲染时缩放所有元素
ctx.scale(scale, scale);
ctx.drawImage(image, clip.x, clip.y, clip.width, clip.height);
```

#### 导出视频/图片

```typescript
// 1. 获取虚拟画布尺寸
const baseSize = getBaseCanvasSize("16:9"); // { width: 1920, height: 1080 }

// 2. 计算目标分辨率的缩放比例
const exportWidth = 1920;
const scale = exportWidth / baseSize.width; // 1.0

// 3. 创建导出画布
const canvas = document.createElement("canvas");
canvas.width = exportWidth;
canvas.height = exportHeight;

// 4. 缩放并渲染
ctx.scale(scale, scale);
// 渲染所有元素（使用虚拟坐标）
```

#### 画布比例切换

```typescript
// 1. 获取旧画布和新画布的虚拟尺寸
const oldSize = getBaseCanvasSize("16:9"); // 1920x1080
const newSize = getBaseCanvasSize("9:16"); // 1080x1920

// 2. 计算元素中心点的相对位置
const centerX = clip.x + clip.width / 2;
const centerY = clip.y + clip.height / 2;
const relativeCenterX = centerX / oldSize.width;
const relativeCenterY = centerY / oldSize.height;

// 3. 映射到新画布（尺寸保持不变）
const newCenterX = relativeCenterX * newSize.width;
const newCenterY = relativeCenterY * newSize.height;
const newX = newCenterX - clip.width / 2;
const newY = newCenterY - clip.height / 2;
```

### 使用示例

#### 添加元素到画布中心

```typescript
import { getBaseCanvasSize } from "./utils/canvasCoordinates";

// 获取虚拟画布尺寸
const baseSize = getBaseCanvasSize(canvasRatio);

// 计算中心位置
const elementWidth = 300;
const elementHeight = 200;
const centerX = (baseSize.width - elementWidth) / 2;
const centerY = (baseSize.height - elementHeight) / 2;

// 创建元素
const clip = {
  id: "clip-1",
  x: centerX,
  y: centerY,
  width: elementWidth,
  height: elementHeight,
  // ... 其他属性
};
```

#### 判断元素是否超出画布

```typescript
const baseSize = getBaseCanvasSize(canvasRatio);

const isOutOfBounds =
  clip.x < 0 ||
  clip.y < 0 ||
  clip.x + clip.width > baseSize.width ||
  clip.y + clip.height > baseSize.height;
```

### 核心模块

虚拟坐标系统由 `canvasCoordinates.ts` 模块管理：

- **`getBaseCanvasSize(canvasRatio)`** - 获取虚拟画布尺寸
- **`getScaleFactor(canvasRatio, targetWidth, targetHeight)`** - 计算缩放比例

详细说明见 [Utils 工具函数](#canvascoordinatests-核心模块) 章节。

---

## 画布比例切换

### 概述

VideoEditor 支持三种画布比例，可以在顶部工具栏随时切换：

- **16:9 横屏** (1920x1080) - 适合 YouTube、Bilibili 等横屏平台
- **9:16 竖屏** (1080x1920) - 适合 TikTok、抖音等竖屏平台
- **1:1 方形** (1080x1080) - 适合 Instagram 等社交平台

### 切换行为

当切换画布比例时，编辑器会智能调整所有元素的位置，确保布局相对一致：

#### 1. 元素尺寸保持不变

- 宽度（width）、高度（height）完全保持不变
- 字体大小（fontSize）保持不变
- 所有样式属性（边框、阴影等）保持不变

#### 2. 位置按相对位置映射

编辑器会计算每个元素中心点在旧画布中的相对位置（百分比），然后映射到新画布：

```typescript
// 计算元素中心点在旧画布中的相对位置
const centerX = clip.x + clip.width / 2;
const centerY = clip.y + clip.height / 2;
const relativeCenterX = centerX / oldCanvasWidth;
const relativeCenterY = centerY / oldCanvasHeight;

// 映射到新画布
const newCenterX = relativeCenterX * newCanvasWidth;
const newCenterY = relativeCenterY * newCanvasHeight;

// 计算新的左上角坐标（尺寸不变）
const newX = newCenterX - clip.width / 2;
const newY = newCenterY - clip.height / 2;
```

#### 3. 边界检查

切换后会自动检查元素是否超出新画布边界，如果超出会自动调整到边界内：

```typescript
// 确保元素不超出画布
newX = Math.max(0, Math.min(newX, newCanvasWidth - width));
newY = Math.max(0, Math.min(newY, newCanvasHeight - height));
```

### 切换示例

#### 示例 1: 从 16:9 切换到 9:16

**原画布** (16:9, 1920x1080):

- 元素位置: x=860, y=490, width=200, height=100
- 元素中心: (960, 540) - 画布正中心
- 相对位置: (50%, 50%)

**新画布** (9:16, 1080x1920):

- 新画布尺寸: 1080x1920
- 新中心映射: (540, 960) - 新画布正中心
- 新元素位置: x=440, y=910, width=200, height=100（尺寸不变）

#### 示例 2: 从 16:9 切换到 1:1

**原画布** (16:9, 1920x1080):

- 元素位置: x=100, y=100, width=300, height=200
- 元素中心: (250, 200)
- 相对位置: (13.0%, 18.5%)

**新画布** (1:1, 1080x1080):

- 新画布尺寸: 1080x1080
- 新中心映射: (140, 200) - 按相对位置映射
- 新元素位置: x=0, y=100, width=300, height=200
  - 注意：x 被调整为 0（原本是 -10，但不能小于 0）

### 使用建议

#### ✅ 适用场景

1. **快速生成多平台视频**

   - 先在 16:9 编辑完成
   - 切换到 9:16 制作竖屏版本
   - 手动微调元素位置和大小

2. **保持布局结构**

   - 元素相对位置关系保持不变
   - 适合简单布局快速转换

3. **测试不同比例效果**
   - 快速预览不同平台的显示效果
   - 随时切换比例查看效果

#### ⚠️ 注意事项

1. **元素可能超出画布**

   - 横屏转竖屏时，宽度较大的元素可能超出
   - 需要手动调整元素大小或位置

2. **需要手动优化**

   - 切换后只是初步映射，可能需要调整
   - 文字大小不会自动缩放，可能需要调整字号
   - 某些元素可能需要重新排版

3. **撤销支持**

   - 切换比例操作会保存到历史记录
   - 可以使用 Ctrl+Z 撤销切换

4. **导出分辨率自动调整**
   - 16:9 → 1920x1080
   - 9:16 → 1080x1920
   - 1:1 → 1080x1080

### 最佳实践

1. **先确定主要平台**

   - 根据主要发布平台选择初始比例
   - 完成主要版本后再切换其他比例

2. **分步调整**

   - 切换比例后先整体预览
   - 逐个调整超出或位置不合适的元素
   - 必要时调整字体大小

3. **利用预览功能**
   - 使用全屏预览查看实际效果
   - 对比不同比例的视觉效果

---

## 使用示例

### 1. 基础使用

```tsx
import VideoEditor from "./components/VideoEditor";

function App() {
  return <VideoEditor />;
}
```

### 2. 保存到后端

```tsx
import VideoEditor from "./components/VideoEditor";
import { ProjectData } from "./components/VideoEditor/utils/projectData";

function App() {
  const handleSave = async (projectData: ProjectData) => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        console.log("项目保存成功");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  return (
    <VideoEditor
      onSave={handleSave}
      autoSaveDelay={5000}
      enableAutoSave={true}
    />
  );
}
```

### 3. 从后端加载项目

```tsx
import { useState, useEffect } from "react";
import VideoEditor from "./components/VideoEditor";
import { ProjectData } from "./components/VideoEditor/utils/projectData";

function App() {
  const [projectData, setProjectData] = useState<ProjectData>();

  useEffect(() => {
    // 从后端加载项目
    fetch("/api/projects/123")
      .then((res) => res.json())
      .then((data) => setProjectData(data));
  }, []);

  return (
    <VideoEditor
      initialData={projectData}
      onSave={(data) => {
        // 更新到后端
        fetch("/api/projects/123", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }}
    />
  );
}
```

### 4. 使用 IndexedDB 本地存储

```tsx
import VideoEditor from "./components/VideoEditor";
import { ProjectData } from "./components/VideoEditor/utils/projectData";

// 保存到 IndexedDB
const saveToIndexedDB = async (data: ProjectData) => {
  const db = await openDB("VideoEditorDB", 1);
  await db.put("projects", data, "currentProject");
};

// 从 IndexedDB 加载
const loadFromIndexedDB = async (): Promise<ProjectData | undefined> => {
  const db = await openDB("VideoEditorDB", 1);
  return await db.get("projects", "currentProject");
};

function App() {
  const [initialData, setInitialData] = useState<ProjectData>();

  useEffect(() => {
    loadFromIndexedDB().then((data) => {
      if (data) setInitialData(data);
    });
  }, []);

  return (
    <VideoEditor
      initialData={initialData}
      onSave={saveToIndexedDB}
      autoSaveDelay={3000}
    />
  );
}
```

### 5. 编程式导出视频

```tsx
import { exportAsMP4 } from "./components/VideoEditor/utils/ffmpegExporter";
import { TimelineClip, MediaItem } from "./components/VideoEditor/types";

async function exportVideo(
  clips: TimelineClip[],
  mediaItems: MediaItem[],
  canvasRatio: string
) {
  try {
    const videoBlob = await exportAsMP4(
      clips,
      mediaItems,
      canvasRatio,
      (progress) => {
        console.log(`导出进度: ${progress}%`);
      },
      {
        resolution: "1920x1080",
        frameRate: 30,
        bitrate: "recommended", // 推荐质量（自动计算码率）
        codec: "libx264", // H.264 编码器
      }
    );

    // 下载视频
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video.mp4";
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("导出失败:", error);
  }
}
```

**不同质量档位示例**:

```tsx
// 低质量（快速分享）- 自动计算码率 ≈ 4.3M (1080P@30fps)
await exportAsMP4(clips, mediaItems, canvasRatio, onProgress, {
  resolution: "1920x1080",
  frameRate: 30,
  bitrate: "lower",
  codec: "libx264",
});

// 推荐质量（YouTube 标准）- 自动计算码率 ≈ 7.5M (1080P@30fps) ⭐
await exportAsMP4(clips, mediaItems, canvasRatio, onProgress, {
  resolution: "1920x1080",
  frameRate: 30,
  bitrate: "recommended",
  codec: "libx264",
});

// 高质量（专业归档）- 自动计算码率 ≈ 12.4M (1080P@30fps)
await exportAsMP4(clips, mediaItems, canvasRatio, onProgress, {
  resolution: "1920x1080",
  frameRate: 30,
  bitrate: "higher",
  codec: "libx264",
});

// 使用 H.265 编码器（自动降低 40% 码率，相同质量更小文件）
await exportAsMP4(clips, mediaItems, canvasRatio, onProgress, {
  resolution: "1920x1080",
  frameRate: 30,
  bitrate: "recommended",
  codec: "libx265", // 码率自动 ≈ 4.5M (7.5M × 0.6)
});

// 60fps 高帧率视频（自动 2倍 码率）
await exportAsMP4(clips, mediaItems, canvasRatio, onProgress, {
  resolution: "1920x1080",
  frameRate: 60,
  bitrate: "recommended",
  codec: "libx264", // 码率自动 ≈ 15M (60fps)
});

// 自定义固定码率
await exportAsMP4(clips, mediaItems, canvasRatio, onProgress, {
  resolution: "1920x1080",
  frameRate: 30,
  bitrate: "10M", // 固定 10 Mbps
  codec: "libx264",
});
```

### 6. 编程式导出当前帧

```tsx
import { exportFrameAsPNG } from "./components/VideoEditor/utils/etroExporter";

async function exportFrame(
  clips: TimelineClip[],
  mediaItems: MediaItem[],
  currentTime: number,
  canvasRatio: string
) {
  const imageBlob = await exportFrameAsPNG(
    clips,
    mediaItems,
    currentTime,
    canvasRatio,
    (progress) => {
      console.log(`导出进度: ${progress}%`);
    }
  );

  // 下载图片
  const url = URL.createObjectURL(imageBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "frame.png";
  a.click();
  URL.revokeObjectURL(url);
}
```

### 7. 编程式导出音频

```tsx
import { exportAudio } from "./components/VideoEditor/utils/audioExporter";
import { TimelineClip, MediaItem } from "./components/VideoEditor/types";

async function exportAudioFile(clips: TimelineClip[], mediaItems: MediaItem[]) {
  try {
    const audioBlob = await exportAudio(
      clips,
      mediaItems,
      (progress) => {
        console.log(`音频导出进度: ${progress}%`);
      },
      {
        format: "mp3", // 格式: mp3, wav, aac, flac, aiff, ogg
        bitrate: "192", // 比特率 (kbps)
        sampleRate: 44100, // 采样率 (Hz)
      }
    );

    // 下载音频文件
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audio.mp3";
    a.click();
    URL.revokeObjectURL(url);

    console.log("音频导出成功！");
  } catch (error) {
    console.error("音频导出失败:", error);
  }
}
```

**多格式导出示例**:

```tsx
// 导出高质量 MP3
await exportAudio(clips, mediaItems, onProgress, {
  format: "mp3",
  bitrate: "320",
  sampleRate: 48000,
});

// 导出无损 FLAC
await exportAudio(clips, mediaItems, onProgress, {
  format: "flac",
  bitrate: "0", // FLAC 不需要比特率
  sampleRate: 48000,
});

// 导出 WAV（快速，无压缩）
await exportAudio(clips, mediaItems, onProgress, {
  format: "wav",
  bitrate: "0",
  sampleRate: 44100,
});
```

---

## 快捷键

| 快捷键                         | 功能         | 状态 |
| ------------------------------ | ------------ | ---- |
| `Space`                        | 播放/暂停    | ✅   |
| `Ctrl+S` / `Cmd+S`             | 手动保存     | ✅   |
| `Ctrl+Z` / `Cmd+Z`             | 撤销         | ✅   |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | 重做         | ✅   |
| `Ctrl+C` / `Cmd+C`             | 复制选中片段 | ✅   |
| `Ctrl+V` / `Cmd+V`             | 粘贴片段     | ✅   |
| `Delete` / `Backspace`         | 删除选中片段 | ✅   |
| `ESC`                          | 退出全屏预览 | ✅   |

**注意**：

- 在输入框、文本框等可编辑元素中，快捷键会被禁用，避免干扰正常输入
- Mac 系统使用 `Cmd` 键，Windows/Linux 系统使用 `Ctrl` 键
- 复制、粘贴、删除片段需要先选中片段才能操作
- 复制操作（`Ctrl+C`）会将片段存入剪贴板，粘贴操作（`Ctrl+V`）会创建新片段并自动选中
- 粘贴的片段会放置在最上层轨道（trackIndex = 0），其他片段自动下移

---

## 常见问题

### Q: 如何自定义画布比例？

A: 在顶部工具栏选择画布比例，支持 16:9（横屏）、9:16（竖屏）、1:1（方形）

**画布比例切换行为**：

当您切换画布比例时，编辑器会自动调整所有元素的位置，以保持整体布局：

1. **元素尺寸保持不变** - 所有元素的宽度、高度、字体大小等都不会改变
2. **位置按比例映射** - 元素的中心点相对位置保持不变，自动映射到新画布
3. **边界检查** - 确保元素不会超出新画布边界

**示例**：

- 从 16:9 (1920x1080) 切换到 9:16 (1080x1920)
- 原本在画布中心的元素 (x: 960, y: 540) 会映射到新画布中心 (x: 540, y: 960)
- 元素的宽高保持不变，如原来 200x100，切换后仍是 200x100

**适用场景**：

- 快速制作不同平台的视频（YouTube 16:9 → TikTok 9:16）
- 保持元素相对位置，只调整画布尺寸
- 需要手动调整元素大小以适应新画布

### Q: 如何使用全屏预览功能？

A: 点击播放控制栏中的全屏按钮即可进入全屏预览模式。全屏预览特点：

- 纯预览模式，无编辑控件（不显示控制框和缩放拖拽）
- 底部播放控制条（播放/暂停、进度条、时间显示）
- 支持进度条拖动快速跳转
- 按 ESC 键或点击右上角关闭按钮退出
- 画布保持正确宽高比，自动居中显示
- 黑色背景（#262626），沉浸式体验
- 使用同一个 PreviewCanvas 组件，避免重新加载

### Q: 导出视频/音频失败怎么办？

A:

1. 检查浏览器是否支持 WebAssembly
2. 确保所有素材都已加载完成
3. 检查浏览器控制台的错误信息
4. 尝试减少项目复杂度或分段导出
5. 对于音频导出，确保至少有一个音频或视频片段（带音轨）
6. 检查网络连接（首次使用需要下载 FFmpeg.wasm）

### Q: 自动保存在哪里？

A: 通过 `onSave` 回调函数处理，可以保存到：

- 后端服务器（fetch API）
- IndexedDB（本地存储）
- LocalStorage（小型项目）

### Q: 如何添加自定义字体？

A:

1. 将字体文件放到 `public/fonts/` 目录
2. 在 `src/mock/fontConfig.json` 中添加配置：

```json
{
  "fonts": [
    {
      "family": "MyFont",
      "displayName": "我的字体",
      "children": [
        {
          "family": "MyFont Regular",
          "displayName": "Regular",
          "url": "/fonts/MyFont/Regular.ttf"
        },
        {
          "family": "MyFont Bold",
          "displayName": "Bold",
          "url": "/fonts/MyFont/Bold.ttf"
        }
      ]
    }
  ]
}
```

3. 重启应用

**注意**:

- 字体文件支持 TTF 和 TTC 格式
- 每个子项的 `family` 是完整的字体 family 名称（用于 CSS font-family）
- `displayName` 是显示在下拉框中的名称（如 "Light", "Bold"）
- 如果字体没有子项，可以这样配置：

```json
{
  "family": "SimpleFont",
  "displayName": "简单字体",
  "url": "/fonts/SimpleFont.ttf",
  "children": []
}
```

### Q: 片段拖动时的吸附功能如何关闭？

A: 当前版本不支持关闭吸附，吸附是为了提高编辑精度

### Q: 如何实现多语言？

A: 项目已集成 react-i18next，语言文件在 `src/locales/` 目录，支持：

- 中文简体（zh）
- 英文（en）
- 日文（ja）
- 中文繁体（zh-TW）

### Q: 如何选择合适的音频导出格式？

A: 根据使用场景选择：

| 场景                 | 推荐格式 | 配置             | 说明                   |
| -------------------- | -------- | ---------------- | ---------------------- |
| 网络分享/播放        | MP3      | 192kbps, 44.1kHz | 兼容性好，文件较小     |
| 高质量音乐           | MP3      | 320kbps, 48kHz   | 接近无损               |
| 专业制作/存档        | FLAC     | 无损, 48kHz      | 无损压缩，适合后期编辑 |
| 播客/语音内容        | MP3      | 128kbps, 44.1kHz | 节省空间，人声清晰     |
| 快速测试/预览        | WAV      | 无损, 44.1kHz    | 无需编码，导出最快     |
| 现代平台（iOS/网页） | AAC      | 192kbps, 44.1kHz | 质量好，文件小         |

**提示**：MP3 和 AAC 需要指定比特率，FLAC 和 WAV 是无损格式不需要比特率参数

---

## 注意事项

### ⚠️ 重要提示

#### 1. 坐标系统

- 所有片段的坐标（x, y, width, height）都基于**虚拟坐标系统**
- 不同画布比例有不同的虚拟尺寸：
  - 16:9 横屏：1920 x 1080
  - 9:16 竖屏：1080 x 1920
  - 1:1 方屏：1080 x 1080
- 渲染和导出时会自动缩放到目标分辨率
- 切换画布比例时，元素位置会按中心点相对位置映射，但尺寸保持不变

#### 2. 文件对象处理

- `MediaItem` 中的 `file` 属性（File 对象）不能序列化
- 保存项目时会转换为 `url` 和 `fileInfo`
- 从服务器加载项目时，需要重新创建 File 对象或使用 URL

#### 3. 性能优化

- 使用 `useAutoSaveWithWorker` 而不是 `useAutoSave` 获得更好的性能
- Worker 模式在数据量大时不会阻塞 UI
- 自动保存默认 3 秒延迟，可根据需要调整
- 全屏预览使用独立组件，优化渲染性能

#### 4. 历史记录

- 最多保存 50 条历史记录
- 不保存播放头位置（currentTime）
- 撤销/重做会延迟更新 UI，确保控制框正确刷新

#### 5. 导出功能

- MP4 导出使用 FFmpeg.wasm，首次加载需要下载约 30MB 的 wasm 文件
- 导出时间取决于项目长度和复杂度
- 建议导出前暂停播放
- 音频导出支持多种格式（MP3/WAV/AAC/FLAC/AIFF/OGG）
- **导出分辨率自动适配画布比例**：
  - 16:9 默认 1920x1080
  - 9:16 默认 1080x1920
  - 1:1 默认 1080x1080
- 导出使用虚拟坐标系统，确保与预览效果一致
- **智能码率计算**：
  - 使用 BPP（Bits Per Pixel）算法自动计算最优码率
  - 考虑分辨率、帧率和编码器效率
  - 推荐使用 "recommended" 质量档位（YouTube 标准）
  - H.265 编码器自动降低 40% 码率，文件更小
  - 支持自定义固定码率（如 "10M"）

#### 6. 字体加载

- 字体文件需要放在 `public/fonts/` 目录
- 字体配置在 `src/mock/fontConfig.json`
- 使用前需确保调用 `fontManager.initialize(fontConfig)`，传入字体配置
- 使用 `fontfaceobserver` 库确保字体加载完成（15 秒超时）
- 支持多子项字体（Light, Regular, Bold 等）
- 每个子项都有独立的 `family`（完整字体名）和 `displayName`（显示名称）

#### 7. 浏览器兼容性

- 需要支持 Web Worker
- 需要支持 WebAssembly（FFmpeg.wasm）
- 建议使用 Chrome、Edge、Firefox 最新版本

#### 8. 素材格式支持

- **视频**: MP4, WebM, MOV
- **音频**: MP3, WAV, AAC
- **图片**: JPG, PNG, GIF, WebP
- 所有素材需要支持 CORS（crossOrigin）

#### 9. 轨道系统

- 轨道 0 为最底层（最先渲染）
- 轨道索引越大，渲染层级越高
- 空轨道会自动删除（除非在插入模式）
- 支持轨道插入和重排

#### 10. 吸附功能

- 吸附阈值：0.1 秒（约 5 像素）
- 脱离阈值：0.15 秒（需要明显拖动才脱离）
- 吸附点：播放头、片段开始/结束位置

#### 11. 全屏预览

- 使用同一个 `PreviewCanvas` 组件，通过 `isFullscreen` prop 区分模式
- 通过 `display: flex/none` 切换显示，避免重新挂载和加载
- 使用 `ResizeObserver` 持续监听容器尺寸，确保画布自适应
- 全屏模式下禁用编辑控件（MoveableControl）和缩放拖拽（ZoomPanWrapper）
- 支持键盘 ESC 快捷退出和关闭按钮
- 底部播放控制条支持播放/暂停、进度拖动、时间显示
- 画布保持正确宽高比，居中显示，上下或左右可能有黑边
- 退出全屏时自动调用 `document.exitFullscreen()`

### 🔒 安全注意

- 用户上传的文件使用 `URL.createObjectURL()`，需要在组件卸载时清理
- 大文件上传建议添加大小限制
- 导出的视频 Blob 建议及时下载并释放内存

### 🚀 性能建议

- 避免同时添加大量素材（建议<50 个）
- 长视频建议分段编辑
- 导出时关闭其他标签页以获得最佳性能
- 使用 Web Worker 模式的自动保存
- 全屏预览通过 `display` 控制显示，避免重复挂载和卸载
- 使用 `ResizeObserver` 代替 `resize` 事件监听，性能更好

### 📱 移动端支持

- 当前版本主要为桌面端优化
- 移动端可能存在性能和交互问题
- 建议在平板或桌面设备上使用

---

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型系统
- **Ant Design** - UI 组件库
- **TailwindCSS** - 样式框架
- **@dnd-kit** - 拖放功能
- **FFmpeg.wasm** - 视频/音频处理
- **react-moveable** - 元素变换控制
- **react-i18next** - 国际化
- **fontfaceobserver** - 字体加载监听

---

## 更新日志

### v1.6.0 (2025-10-28)

- ✅ **视频导出码率计算重构**
  - 从阶梯式固定码率改为 **BPP（Bits Per Pixel）算法**
  - 公式：`码率 = 像素数 × 帧率 × BPP系数 × 编码器效率`
  - 支持自动适配任意分辨率和帧率
  - 考虑编码器效率（H.265 降低 40%，AV1 降低 50%）
  - 精确的线性计算，避免阶梯式误差
  - 符合 YouTube/Netflix 行业标准
- ✅ **码率质量档位优化**
  - **lower (0.07 BPP)**: 低质量，适合快速分享，1080P@30fps ≈ 4.3M
  - **recommended (0.12 BPP)**: 推荐质量，YouTube 标准，1080P@30fps ≈ 7.5M ⭐
  - **higher (0.20 BPP)**: 高质量，专业归档，1080P@30fps ≈ 12.4M
  - 支持自定义码率（如 "5M"）
- ✅ **智能编码器适配**
  - H.264: 基准编码器（效率系数 1.0）
  - H.265/HEVC: 自动降低 40% 码率（效率系数 0.6）
  - AV1: 自动降低 50% 码率（效率系数 0.5）
  - 相同质量下显著减小文件大小
- ✅ **帧率感知**
  - 60fps 视频自动使用 2 倍 码率
  - 24fps 视频自动降低码率
  - 确保不同帧率下视觉质量一致
- ✅ **画布比例感知**
  - 1:1 方屏自动使用更低码率（像素更少）
  - 16:9 和 9:16 像素相同时使用相同码率
  - 精确基于总像素数计算
- ✅ **TimelineClip 新增 type 字段**
  - 在 `TimelineClip` 接口中新增 `type` 字段（可选）
  - 保存片段类型（video/audio/image/text），无需查找 MediaItem
  - 创建片段时自动填充 type 字段
  - 加载旧项目时自动补充 type 字段（兼容性处理）
  - 提高性能，减少 MediaItem 查找次数
- ✅ 更新 API 文档
  - 新增 BPP 算法详细说明
  - 新增编码器效率对照表
  - 新增质量档位参考码率表
  - 优化导出选项说明
  - 更新 TimelineClip 类型定义

### v1.5.0 (2025-10-27)

- ✅ 优化画布比例切换逻辑
  - 元素尺寸（width, height）在切换时保持不变
  - 字体大小（fontSize）保持不变，不再自动缩放
  - 位置按元素中心点的相对位置映射到新画布
  - 保持元素相对布局，确保视觉一致性
  - 添加边界检查，防止元素超出画布
- ✅ 完善虚拟坐标系统
  - 新增 `canvasCoordinates.ts` 核心模块
  - 统一不同画布比例的虚拟坐标系统标准
  - 16:9=1920x1080, 9:16=1080x1920, 1:1=1080x1080
  - 所有元素坐标基于虚拟坐标系统存储
- ✅ 导出功能优化
  - ffmpegExporter 自动适配画布比例的虚拟坐标系统
  - etroExporter 支持根据画布比例使用对应的基准尺寸
  - 导出时自动缩放到目标分辨率
  - 确保预览效果与导出结果一致
- ✅ 新增画布比例切换专题文档
  - 详细说明切换行为和算法
  - 提供切换示例和最佳实践
  - 添加使用建议和注意事项
- ✅ 完善项目文档
  - 新增 `canvasCoordinates.ts` 详细说明
  - 更新导出模块文档（ffmpegExporter, etroExporter）
  - 更新坐标系统相关说明
  - 更新项目结构和目录

### v1.4.0 (2025-10-25)

- ✅ 全屏预览架构优化
  - 移除 `FullscreenPreviewCanvas` 组件，统一使用 `PreviewCanvas`
  - `PreviewCanvas` 通过 `isFullscreen` prop 支持普通和全屏两种模式
  - 使用 `display: flex/none` 切换显示，避免重新挂载和加载
  - 使用 `ResizeObserver` 持续监听容器尺寸变化，确保画布自适应
  - 全屏模式下画布保持正确宽高比，居中显示
  - `ZoomPanWrapper` 支持禁用模式，全屏时自动调整容器为 `100%` 宽高
  - 修复全屏时画布变形和位置不居中的问题
  - 优化全屏进入和退出的流畅性
- ✅ 文本编辑优化
  - 修复文本输入框换行后删除文字高度无法回缩的问题
  - 文本容器使用 `minHeight: 100%` 允许高度自动扩展
  - 动态计算文本实际内容高度，自适应调整控制框大小
  - 添加详细的调试日志，便于追踪高度变化

### v1.3.0 (2025-10-24)

- ✅ 新增全屏预览功能
  - 新增 `FullscreenPreview` 全屏预览模态框
  - 新增 `FullscreenPreviewCanvas` 专用预览画布（已在 v1.4.0 移除）
  - 支持播放控制、进度拖动、时间显示
  - 支持 ESC 键退出、顶部关闭按钮
  - 优化全屏模式性能和渲染
- ✅ 新增完整的快捷键支持
  - `Space` - 播放/暂停
  - `Ctrl+Z` / `Cmd+Z` - 撤销
  - `Ctrl+Shift+Z` / `Cmd+Shift+Z` - 重做
  - `Ctrl+C` / `Cmd+C` - 复制选中片段到剪贴板
  - `Ctrl+V` / `Cmd+V` - 粘贴片段（自动选中新片段）
  - `Delete` / `Backspace` - 删除选中片段
  - `Ctrl+S` / `Cmd+S` - 手动保存
  - `ESC` - 退出全屏预览
  - 智能识别 Mac/Windows 系统，自动适配 Cmd/Ctrl 键
  - 在可编辑元素中自动禁用快捷键，避免冲突
  - 粘贴的片段会放置在最上层轨道，其他片段自动下移
- ✅ 新增 `ExportPanel` 导出面板组件
- ✅ 新增 `ExportProgressModal` 导出进度弹窗
- ✅ 新增 `LoadingDots` 加载动画组件
- ✅ 优化 MediaElement 组件，支持全屏模式标识
- ✅ 改进项目结构，增加 Header、Controls、common 文件夹

### v1.2.0 (2025-10-21)

- ✅ 字体配置结构优化：`variants` → `children`
- ✅ 字体子项结构调整：支持 `family` 和 `displayName` 字段
- ✅ 字体管理器 API 更新：
  - `getFontVariants` → `getFontChildren`
  - `getVariantName` → `getChildDisplayName`
  - 优化 `getBaseFontFamily` 实现，通过配置查找基础字体
- ✅ 改进字体选择逻辑：
  - 字体下拉框显示 `displayName`（如"微软雅黑"）
  - 字重下拉框显示子项的 `displayName`（如"Bold"）
  - 设置字体使用完整的 `family`（如"Microsoft YaHei Bold"）

### v1.1.0 (2025-10-20)

- ✅ 字体管理器重构为函数式实现
- ✅ 集成 fontfaceobserver 确保字体加载
- ✅ 支持多变体字体（Regular, Bold, Italic 等）
- ✅ 优化字体路径处理（支持 PUBLIC_URL）
- ✅ 改进字体选择器边距样式

### v1.0.0

- ✅ 基础编辑功能
- ✅ 多轨道支持
- ✅ 视频导出
- ✅ 音频导出（多种格式）
- ✅ 自动保存
- ✅ 撤销/重做
- ✅ 国际化支持

---

## 许可证

请根据项目实际情况添加许可证信息。

---

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

---

**文档版本**: 1.6.0  
**最后更新**: 2025-10-28
