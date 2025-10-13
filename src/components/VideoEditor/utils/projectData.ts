import { MediaItem, TimelineClip } from "../types";

// 项目数据接口
export interface ProjectData {
  version: string; // 数据版本号
  projectName: string;
  createdAt: string;
  updatedAt: string;
  
  // 素材数据
  mediaItems: SerializableMediaItem[];
  
  // 时间轴数据
  clips: TimelineClip[];
  
  // 画布配置
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    ratio: string; // "16:9" | "9:16" | "1:1"
  };
  
  // 时间轴配置
  timeline: {
    scale: number; // 时间轴缩放比例
    currentTime: number; // 当前播放时间
    duration: number; // 项目总时长
  };
  
  // 编辑器状态
  editor: {
    selectedClipId: string | null; // 选中的片段ID
    playState: 'playing' | 'paused';
  };
}

// 标准画布尺寸（所有坐标基于此尺寸）
export const STANDARD_CANVAS_SIZES = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
} as const;

// 可序列化的素材项（File对象不能直接序列化）
export interface SerializableMediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'text';
  url: string; // URL或base64
  duration?: number;
  thumbnail?: string;
  waveform?: string;
  width?: number;
  height?: number;
  // 不保存 file 对象，改为保存文件的元数据
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
}

/**
 * 将MediaItem转换为可序列化格式
 */
export const serializeMediaItem = async (item: MediaItem): Promise<SerializableMediaItem> => {
  const serializable: SerializableMediaItem = {
    id: item.id,
    name: item.name,
    type: item.type,
    url: item.url,
    duration: item.duration,
    thumbnail: item.thumbnail, // 保存 thumbnail 字段
    waveform: item.waveform, // 保存 waveform 字段
    width: item.width,
    height: item.height,
  };

  // 保存文件元数据
  if (item.file) {
    serializable.fileInfo = {
      name: item.file.name,
      type: item.file.type,
      size: item.file.size,
    };
  }

  // 如果URL是blob URL，转换为base64
  if (item.url.startsWith('blob:')) {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      serializable.url = base64;
    } catch (error) {
      console.warn('无法转换blob URL为base64:', error);
    }
  }

  return serializable;
};

/**
 * 将可序列化格式转换回MediaItem
 */
export const deserializeMediaItem = (item: SerializableMediaItem): MediaItem => {
  // 创建一个空的File对象作为占位符
  const file = item.fileInfo 
    ? new File([], item.fileInfo.name, { type: item.fileInfo.type })
    : new File([], 'placeholder.txt');

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    url: item.url,
    file: file,
    duration: item.duration,
    thumbnail: item.thumbnail, // 保留 thumbnail 字段
    waveform: item.waveform, // 保留 waveform 字段
    width: item.width,
    height: item.height,
  };
};

/**
 * 保存项目数据
 */
export const saveProjectData = async (
  projectName: string,
  mediaItems: MediaItem[],
  clips: TimelineClip[],
  canvas: ProjectData['canvas'],
  timeline: ProjectData['timeline'],
  editor: ProjectData['editor']
): Promise<ProjectData> => {
  // 序列化素材
  const serializedMediaItems = await Promise.all(
    mediaItems.map(item => serializeMediaItem(item))
  );

  const projectData: ProjectData = {
    version: '1.0.0',
    projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mediaItems: serializedMediaItems,
    clips: clips,
    canvas: canvas,
    timeline: timeline,
    editor: editor,
  };

  return projectData;
};

/**
 * 加载项目数据
 */
export const loadProjectData = (projectData: ProjectData, targetCanvasSize?: { width: number; height: number }): {
  mediaItems: MediaItem[];
  clips: TimelineClip[];
  canvas: ProjectData['canvas'];
  timeline: ProjectData['timeline'];
  editor: ProjectData['editor'];
} => {
  // 反序列化素材
  const mediaItems = projectData.mediaItems.map(item => deserializeMediaItem(item));

  // 获取源画布尺寸
  const sourceCanvasSize = { 
    width: projectData.canvas?.width || 1920, 
    height: projectData.canvas?.height || 1080 
  };

  // 如果指定了目标尺寸且与源尺寸不同，需要转换坐标
  let clips = projectData.clips;
  if (targetCanvasSize && 
      (targetCanvasSize.width !== sourceCanvasSize.width || 
       targetCanvasSize.height !== sourceCanvasSize.height)) {
    const scaleX = targetCanvasSize.width / sourceCanvasSize.width;
    const scaleY = targetCanvasSize.height / sourceCanvasSize.height;
    
    clips = projectData.clips.map(clip => ({
      ...clip,
      x: clip.x !== undefined ? clip.x * scaleX : undefined,
      y: clip.y !== undefined ? clip.y * scaleY : undefined,
      width: clip.width !== undefined ? clip.width * scaleX : undefined,
      height: clip.height !== undefined ? clip.height * scaleY : undefined,
    }));
  }

  return {
    mediaItems,
    clips,
    canvas: projectData.canvas || { width: 1920, height: 1080, backgroundColor: "#000000", ratio: "16:9" },
    timeline: projectData.timeline || { scale: 8, currentTime: 0, duration: 30 },
    editor: projectData.editor || { selectedClipId: null, playState: "paused" },
  };
};

/**
 * 导出项目为JSON文件
 */
export const exportProjectAsJSON = async (
  projectName: string,
  mediaItems: MediaItem[],
  clips: TimelineClip[],
  canvas: ProjectData['canvas'],
  timeline: ProjectData['timeline'],
  editor: ProjectData['editor']
) => {
  const projectData = await saveProjectData(projectName, mediaItems, clips, canvas, timeline, editor);
  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 从JSON文件导入项目
 */
export const importProjectFromJSON = (file: File): Promise<ProjectData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const projectData = JSON.parse(text) as ProjectData;
        
        // 验证数据格式
        if (!projectData.version || !projectData.mediaItems || !projectData.clips) {
          throw new Error('无效的项目文件格式');
        }
        
        resolve(projectData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * 将Blob转换为Base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

