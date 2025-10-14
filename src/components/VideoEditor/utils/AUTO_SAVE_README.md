# 自动保存功能使用说明

## 概述

项目提供了两种自动保存方案：

1. **传统方案** (`useAutoSave`) - 在主线程中处理
2. **Web Worker 方案** (`useAutoSaveWithWorker`) - 在独立线程中处理，性能更好

## 方案对比

| 特性       | useAutoSave    | useAutoSaveWithWorker |
| ---------- | -------------- | --------------------- |
| 实现位置   | 主线程         | 主线程 + Web Worker   |
| 性能影响   | 大项目可能卡顿 | 几乎无感知            |
| 浏览器支持 | 所有浏览器     | 现代浏览器            |
| 降级方案   | -              | 自动降级到主线程      |
| 推荐场景   | 小项目         | 中大型项目            |

## 已修复的问题

### ✅ 修复：没有修改页面也会自动触发保存

**问题原因：**

- useEffect 依赖数组中包含了 `generateDataSnapshot` 和 `triggerAutoSave` 函数
- 这些函数每次渲染都会重新创建，导致 useEffect 不必要地执行

**解决方案：**

```typescript
// ❌ 错误：依赖函数引用
useEffect(() => {
  // ...
}, [mediaItems, clips, generateDataSnapshot, triggerAutoSave]);

// ✅ 正确：只依赖实际数据
useEffect(() => {
  // ...
}, [mediaItems, clips, canvasRatio, projectName]);
```

## 使用方法

### 方案一：传统自动保存（当前使用）

```typescript
import { useAutoSave } from "./hooks/useAutoSave";

// 在组件中使用
useAutoSave({
  mediaItems,
  clips,
  projectName,
  canvasRatio,
  scale,
  currentTime,
  selectedClipId,
  onSave,
  autoSaveDelay: 3000, // 3秒延迟
  enabled: true, // 启用自动保存
});
```

### 方案二：Web Worker 自动保存（推荐）

```typescript
import { useAutoSaveWithWorker } from "./hooks/useAutoSaveWithWorker";

// 在组件中使用
const { workerAvailable } = useAutoSaveWithWorker({
  mediaItems,
  clips,
  projectName,
  canvasRatio,
  scale,
  currentTime,
  selectedClipId,
  onSave,
  autoSaveDelay: 3000,
  enabled: true,
  useWorker: true, // 启用 Web Worker
});

// 可选：显示 Worker 状态
console.log("Worker 可用:", workerAvailable);
```

## 切换到 Web Worker 方案

在 `VideoEditor/index.tsx` 中修改：

```typescript
// 1. 更改导入
- import { useAutoSave } from "./hooks/useAutoSave";
+ import { useAutoSaveWithWorker } from "./hooks/useAutoSaveWithWorker";

// 2. 更改使用
- useAutoSave({
+ useAutoSaveWithWorker({
    mediaItems,
    clips,
    // ... 其他参数
+   useWorker: true,  // 启用 Web Worker
  });
```

## Web Worker 工具函数

### createAutoSaveWorker()

创建一个自动保存 Web Worker 实例：

```typescript
import { createAutoSaveWorker } from "./utils/autoSaveWorker";

const worker = createAutoSaveWorker();
if (worker) {
  worker.postMessage({
    type: "GENERATE_SNAPSHOT",
    payload: { mediaItems, clips, canvasRatio, projectName },
  });
}
```

### generateDataSnapshot()

在主线程中生成数据快照（备用方法）：

```typescript
import { generateDataSnapshot } from "./utils/autoSaveWorker";

const snapshot = generateDataSnapshot(
  mediaItems,
  clips,
  canvasRatio,
  projectName
);
```

### prepareProjectSaveData()

在主线程中准备保存数据（备用方法）：

```typescript
import { prepareProjectSaveData } from "./utils/autoSaveWorker";

const projectData = prepareProjectSaveData(
  projectName,
  mediaItems,
  clips,
  canvas,
  timeline,
  ui
);
```

## 配置参数

### autoSaveDelay

自动保存延迟时间（毫秒）：

- `1000` - 1 秒，适合开发环境
- `3000` - 3 秒，适合生产环境（推荐）
- `5000` - 5 秒，适合慢速网络

### enabled

控制是否启用自动保存：

- `true` - 启用自动保存（推荐）
- `false` - 禁用自动保存，仅支持 Ctrl+S

### useWorker（仅 useAutoSaveWithWorker）

控制是否使用 Web Worker：

- `true` - 优先使用 Web Worker，不可用时自动降级
- `false` - 始终使用主线程模式

## 快捷键

- `Ctrl+S` (Windows/Linux) 或 `Cmd+S` (Mac) - 手动保存

## 降级策略

Web Worker 方案会自动降级：

1. 浏览器不支持 Web Worker → 使用主线程
2. Worker 创建失败 → 使用主线程
3. Worker 运行时错误 → 使用主线程

降级过程对用户透明，功能不受影响。

## 性能建议

### 小项目（< 10 个片段）

```typescript
useAutoSave({
  autoSaveDelay: 2000,
  // 传统方案足够
});
```

### 中等项目（10-50 个片段）

```typescript
useAutoSaveWithWorker({
  autoSaveDelay: 3000,
  useWorker: true, // 使用 Worker 提升性能
});
```

### 大项目（> 50 个片段）

```typescript
useAutoSaveWithWorker({
  autoSaveDelay: 5000, // 延长延迟减少频率
  useWorker: true,
});
```

## 调试技巧

### 查看保存触发

```typescript
useEffect(() => {
  console.log("📊 数据变化:", { mediaItems, clips });
}, [mediaItems, clips]);
```

### 监控 Worker 状态

```typescript
const { workerAvailable } = useAutoSaveWithWorker({
  // ...
  useWorker: true,
});

useEffect(() => {
  console.log("🔧 Worker 状态:", workerAvailable ? "运行中" : "未启用");
}, [workerAvailable]);
```

### 检查保存数据

修改 `onSave` 回调：

```typescript
const handleSave = (projectData: ProjectData) => {
  console.log("💾 保存数据:", projectData);
  // 实际保存逻辑
};
```

## 常见问题

### Q1: 为什么会频繁保存？

可能原因：

- autoSaveDelay 设置过短
- 数据频繁变化（如动画播放）

解决：增加 autoSaveDelay 或暂停时才保存

### Q2: Worker 不可用怎么办？

自动降级到主线程模式，功能正常但性能稍差

### Q3: 如何禁用自动保存？

```typescript
useAutoSave({
  enabled: false, // 禁用自动保存
});
```

### Q4: 保存失败怎么处理？

在 onSave 中捕获错误：

```typescript
const handleSave = async (data: ProjectData) => {
  try {
    await saveToServer(data);
  } catch (error) {
    console.error("保存失败:", error);
    // 显示错误提示
  }
};
```

## 文件结构

```
utils/
  ├── autoSaveWorker.ts       # Web Worker 工具
  └── AUTO_SAVE_README.md     # 本文档

hooks/
  ├── useAutoSave.ts          # 传统自动保存
  └── useAutoSaveWithWorker.ts # Web Worker 自动保存
```
