import { TimelineClip, MediaItem } from '../types';

export interface HistoryState {
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  selectedClipId: string | null;
  timestamp: number;
  description: string;
}

/**
 * 历史管理器 - 重写版本
 * 
 * 工作原理：
 * - history 数组保存所有历史状态
 * - currentIndex 指向当前状态在 history 中的位置
 * - 每次操作都会保存新状态到 currentIndex+1 位置，并清除后面的历史
 * - 撤销：currentIndex--，返回 history[currentIndex]
 * - 重做：currentIndex++，返回 history[currentIndex]
 */
export class HistoryManager {
  private history: HistoryState[] = [];
  private currentIndex: number = -1; // -1 表示还没有任何历史记录
  private maxHistorySize: number = 50;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingState: HistoryState | null = null;

  constructor(maxSize: number = 50) {
    this.maxHistorySize = maxSize;
  }

  /**
   * 推送新的历史状态
   * 注意：不保存 currentTime，因为播放头位置是视图状态，不应该被撤销/重做影响
   */
  push(
    clips: TimelineClip[],
    mediaItems: MediaItem[],
    selectedClipId: string | null,
    description: string
  ): void {
    // 清除所有在当前位置之后的历史（因为我们要创建新的分支）
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 创建新的历史状态（不保存 currentTime）
    const newState: HistoryState = {
      clips: this.deepClone(clips),
      mediaItems: this.deepClone(mediaItems),
      selectedClipId,
      timestamp: Date.now(),
      description
    };

    // 添加到历史记录
    this.history.push(newState);
    this.currentIndex = this.history.length - 1;

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    console.log(`📝 [历史] 保存: ${description}`, {
      currentIndex: this.currentIndex,
      historySize: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      clips: newState.clips.map(c => ({
        id: c.id,
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
        rotation: c.rotation,
        scale: c.scale
      }))
    });
  }

  /**
   * 防抖推送（用于频繁操作，如拖动、调整大小）
   */
  pushDebounced(
    clips: TimelineClip[],
    mediaItems: MediaItem[],
    selectedClipId: string | null,
    description: string,
    delay: number = 300
  ): void {
    // 清除之前的定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 保存待处理的状态
    this.pendingState = {
      clips: this.deepClone(clips),
      mediaItems: this.deepClone(mediaItems),
      selectedClipId,
      timestamp: Date.now(),
      description
    };

    // 设置新的定时器
    this.debounceTimer = setTimeout(() => {
      if (this.pendingState) {
        this.push(
          this.pendingState.clips,
          this.pendingState.mediaItems,
          this.pendingState.selectedClipId,
          this.pendingState.description
        );
        this.pendingState = null;
      }
    }, delay);
  }

  /**
   * 立即保存待处理的状态（用于操作结束）
   * @returns 是否保存了待处理的状态
   */
  flush(): boolean {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.pendingState) {
      console.log('💾 [历史] 保存待处理的状态:', this.pendingState.description);
      this.push(
        this.pendingState.clips,
        this.pendingState.mediaItems,
        this.pendingState.selectedClipId,
        this.pendingState.description
      );
      this.pendingState = null;
      return true;
    }
    return false;
  }

  /**
   * 撤销操作
   * 返回上一个状态
   */
  undo(): HistoryState | null {
    if (!this.canUndo()) {
      console.log('⚠️ [历史] 无法撤销');
      return null;
    }

    this.currentIndex--;
    const state = this.history[this.currentIndex];
    
    console.log(`↩️ [历史] 撤销到: ${state.description}`, {
      currentIndex: this.currentIndex,
      historySize: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      clips: state.clips.map(c => ({
        id: c.id,
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
        rotation: c.rotation,
        scale: c.scale
      }))
    });

    return this.deepClone(state);
  }

  /**
   * 重做操作
   * 返回下一个状态
   */
  redo(): HistoryState | null {
    if (!this.canRedo()) {
      console.log('⚠️ [历史] 无法重做');
      return null;
    }

    this.currentIndex++;
    const state = this.history[this.currentIndex];
    
    console.log(`↪️ [历史] 重做到: ${state.description}`, {
      currentIndex: this.currentIndex,
      historySize: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      clips: state.clips.map(c => ({
        id: c.id,
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
        rotation: c.rotation,
        scale: c.scale
      }))
    });

    return this.deepClone(state);
  }

  /**
   * 检查是否可以撤销
   * 可以撤销条件：currentIndex > 0（有上一个状态）
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以重做
   * 可以重做条件：currentIndex < history.length - 1（有下一个状态）
   */
  canRedo(): boolean {
    return this.currentIndex >= 0 && this.currentIndex < this.history.length - 1;
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): HistoryState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.deepClone(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.pendingState = null;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    console.log('🗑️ [历史] 已清空');
  }

  /**
   * 获取历史记录信息
   */
  getInfo(): {
    size: number;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
  } {
    return {
      size: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * 获取历史记录列表（用于调试）
   */
  getHistoryList(): Array<{ index: number; description: string; isCurrent: boolean }> {
    return this.history.map((state, index) => ({
      index,
      description: state.description,
      isCurrent: index === this.currentIndex
    }));
  }

  /**
   * 深拷贝对象
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// 创建全局历史管理器实例
export const historyManager = new HistoryManager(50);
