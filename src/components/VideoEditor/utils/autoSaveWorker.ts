/**
 * 自动保存 Web Worker 工具
 * 提供在独立线程中处理数据序列化的功能
 */

import { MediaItem, TimelineClip } from "../types";
import { ProjectData } from "./projectData";

/**
 * 创建自动保存 Web Worker
 * 返回一个 Worker 实例，用于在后台处理数据序列化
 */
export function createAutoSaveWorker(): Worker | null {
  try {
    // 创建内联 Worker
    const workerCode = `
      /* eslint-disable no-restricted-globals */
      
      // 生成数据快照
      function generateDataSnapshot(data) {
        return JSON.stringify({
          mediaItems: data.mediaItems.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            url: item.url,
          })),
          clips: data.clips.map(clip => ({
            id: clip.id,
            mediaId: clip.mediaId,
            start: clip.start,
            end: clip.end,
            trackIndex: clip.trackIndex,
            x: clip.x,
            y: clip.y,
            width: clip.width,
            height: clip.height,
            text: clip.text,
          })),
          canvasRatio: data.canvasRatio,
          projectName: data.projectName,
        });
      }
      
      // 准备项目数据
      function prepareProjectData(data) {
        const { projectName, mediaItems, clips, canvas, timeline, ui } = data;
        
        return {
          version: "1.0",
          projectName: projectName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          canvas: {
            width: canvas.width,
            height: canvas.height,
            backgroundColor: canvas.backgroundColor,
            ratio: canvas.ratio,
          },
          timeline: {
            scale: timeline.scale,
            currentTime: timeline.currentTime,
            duration: timeline.duration,
          },
          editor: {
            selectedClipId: ui.selectedClipId,
            playState: ui.playState,
          },
          mediaItems: mediaItems.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            url: item.url,
            thumbnail: item.thumbnail,
            duration: item.duration,
            width: item.width,
            height: item.height,
          })),
          clips: clips.map(clip => ({
            id: clip.id,
            mediaId: clip.mediaId,
            start: clip.start,
            end: clip.end,
            trimStart: clip.trimStart,
            trimEnd: clip.trimEnd,
            trackIndex: clip.trackIndex,
            x: clip.x,
            y: clip.y,
            width: clip.width,
            height: clip.height,
            rotation: clip.rotation,
            scale: clip.scale,
            opacity: clip.opacity,
            text: clip.text,
            textStyle: clip.textStyle,
            mediaStyle: clip.mediaStyle,
            cropArea: clip.cropArea,
          })),
        };
      }
      
      // 监听消息
      self.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        
        try {
          switch (type) {
            case 'GENERATE_SNAPSHOT':
              const snapshot = generateDataSnapshot(payload);
              self.postMessage({
                type: 'SNAPSHOT_READY',
                payload: snapshot,
              });
              break;
              
            case 'PREPARE_SAVE':
              const projectData = prepareProjectData(payload);
              self.postMessage({
                type: 'SAVE_READY',
                payload: projectData,
              });
              break;
              
            default:
              console.warn('Unknown message type:', type);
          }
        } catch (error) {
          self.postMessage({
            type: 'ERROR',
            payload: {
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      });
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    console.log("✅ 自动保存 Web Worker 已创建（内联模式）");
    return worker;
  } catch (error) {
    console.error("❌ 无法创建 Web Worker:", error);
    return null;
  }
}

/**
 * 生成数据快照（在主线程中使用的备用方法）
 */
export function generateDataSnapshot(
  mediaItems: MediaItem[],
  clips: TimelineClip[],
  canvasRatio: string,
  projectName: string
): string {
  return JSON.stringify({
    mediaItems: mediaItems.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      url: item.url,
    })),
    clips: clips.map((clip) => ({
      id: clip.id,
      mediaId: clip.mediaId,
      start: clip.start,
      end: clip.end,
      trackIndex: clip.trackIndex,
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
      text: clip.text,
    })),
    canvasRatio,
    projectName,
  });
}

/**
 * 准备项目保存数据（在主线程中使用的备用方法）
 */
export function prepareProjectSaveData(
  projectName: string,
  mediaItems: MediaItem[],
  clips: TimelineClip[],
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    ratio: string;
  },
  timeline: {
    scale: number;
    currentTime: number;
    duration: number;
  },
  ui: {
    selectedClipId: string | null;
    playState: string;
  }
): ProjectData {
  return {
    version: "1.0",
    projectName: projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvas: {
      width: canvas.width,
      height: canvas.height,
      backgroundColor: canvas.backgroundColor,
      ratio: canvas.ratio,
    },
    timeline: {
      scale: timeline.scale,
      currentTime: timeline.currentTime,
      duration: timeline.duration,
    },
    editor: {
      selectedClipId: ui.selectedClipId,
      playState: ui.playState as 'playing' | 'paused',
    },
    mediaItems: mediaItems.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      url: item.url,
      thumbnail: item.thumbnail,
      duration: item.duration,
      width: item.width,
      height: item.height,
    })),
    clips: clips.map((clip) => ({
      id: clip.id,
      mediaId: clip.mediaId,
      start: clip.start,
      end: clip.end,
      trimStart: clip.trimStart,
      trimEnd: clip.trimEnd,
      trackIndex: clip.trackIndex,
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
      rotation: clip.rotation,
      scale: clip.scale,
      opacity: clip.opacity,
      text: clip.text,
      textStyle: clip.textStyle,
      mediaStyle: clip.mediaStyle,
      cropArea: clip.cropArea,
    })),
  };
}

// Worker 消息类型定义
export interface WorkerMessage {
  type: "GENERATE_SNAPSHOT" | "PREPARE_SAVE";
  payload: any;
}

export interface WorkerResponse {
  type: "SNAPSHOT_READY" | "SAVE_READY" | "ERROR";
  payload: any;
}

