import React, { useRef, useEffect, useState } from "react";
import { MediaItem, TimelineClip } from "../types";
import { MediaElement } from "./MediaElement";
import { MoveableControl } from "./MoveableControl";
import ZoomPanWrapper from "./ZoomPanWrapper";

interface PreviewCanvasProps {
  currentTime: number;
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  isPlaying: boolean;
  canvasRatio?: string;
  selectedClipId?: string | null;
  onClipUpdate?: (id: string, updates: Partial<TimelineClip>) => void;
  onClipSelect?: (id: string | null) => void;
  forceUpdateTextRef?: React.MutableRefObject<(() => void) | null>;
}

const PreviewCanvasComponent: React.FC<PreviewCanvasProps> = ({
  currentTime,
  clips,
  mediaItems,
  isPlaying,
  canvasRatio = "16:9",
  selectedClipId,
  onClipUpdate,
  onClipSelect,
  forceUpdateTextRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 画布选中状态

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const textRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const isEditingRef = useRef<Set<string>>(new Set());

  // 监控 clips 变化
  useEffect(() => {
    console.log("🎨 [PreviewCanvas] clips 状态更新:", {
      clips数量: clips.length,
      clipIds: clips.map((c) => c.id),
    });
  }, [clips]);

  // 提供给父组件的强制更新文字函数
  useEffect(() => {
    if (forceUpdateTextRef) {
      forceUpdateTextRef.current = () => {
        console.log("🔄 强制更新所有文字");
        // 清除编辑状态
        isEditingRef.current.forEach((clipId) => {
          const textElement = textRefs.current[clipId];
          if (textElement && document.activeElement === textElement) {
            textElement.blur();
          }
        });
        isEditingRef.current.clear();

        // 强制更新所有文字内容
        clips.forEach((clip) => {
          if (clip.text !== undefined && textRefs.current[clip.id]) {
            const textElement = textRefs.current[clip.id];
            textElement.textContent = clip.text || "Text";
            console.log(`  📝 强制更新文字: ${clip.id} -> "${clip.text}"`);
          }
        });
      };
    }
  }, [clips, forceUpdateTextRef]);

  // 监听容器大小变化，只在初始加载和比例变化时更新
  useEffect(() => {
    if (!containerRef.current) return;

    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
        console.log("Container size updated:", {
          width: rect.width,
          height: rect.height,
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [canvasRatio]); // 依赖canvasRatio，比例变化时重新计算

  // 初始加载时获取容器大小
  useEffect(() => {
    if (!containerRef.current) return;

    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
        console.log("Initial container size:", {
          width: rect.width,
          height: rect.height,
        });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 根据比例和容器大小计算画布大小，保持20px安全距离
  const getCanvasSize = () => {
    if (!containerSize.width || !containerSize.height) {
      return { width: 0, height: 0 };
    }

    let ratio: number;
    switch (canvasRatio) {
      case "16:9":
        ratio = 16 / 9;
        break;
      case "9:16":
        ratio = 9 / 16;
        break;
      case "1:1":
        ratio = 1;
        break;
      default:
        ratio = 16 / 9;
    }

    // 计算可用空间（减去40px安全距离：上下左右各20px）
    const availableWidth = containerSize.width - 80;
    const availableHeight = containerSize.height - 80;

    // 根据容器大小和比例计算画布大小
    const containerRatio = availableWidth / availableHeight;
    let canvasWidth, canvasHeight;

    if (containerRatio > ratio) {
      // 容器更宽，以高度为准
      canvasHeight = availableHeight;
      canvasWidth = canvasHeight * ratio;
    } else {
      // 容器更高，以宽度为准
      canvasWidth = availableWidth;
      canvasHeight = canvasWidth / ratio;
    }

    console.log("📏 画布尺寸计算:", {
      容器大小: containerSize,
      可用空间: { width: availableWidth, height: availableHeight },
      画布大小: {
        width: Math.round(canvasWidth),
        height: Math.round(canvasHeight),
      },
      比例: canvasRatio,
      标准尺寸_16_9: "1920x1080",
      标准尺寸_9_16: "1080x1920",
      标准尺寸_1_1: "1080x1080",
    });

    return { width: canvasWidth, height: canvasHeight };
  };

  const canvasSize = getCanvasSize();

  // 获取当前时间点应该显示的所有片段
  const getActiveClips = () => {
    return clips.filter(
      (clip) => currentTime >= clip.start && currentTime < clip.end
    );
  };

  const activeClips = getActiveClips();

  // 调试：记录 clips 变化
  useEffect(() => {
    console.log("🎬 [PreviewCanvas] clips 变化", {
      totalClips: clips.length,
      activeClips: activeClips.length,
      clipIds: clips.map((c) => c.id).join(", "),
    });
  }, [clips, activeClips.length]);

  // 清理无效的 refs（当片段被删除时）
  useEffect(() => {
    const validClipIds = new Set(clips.map((c) => c.id));

    // 清理无效的视频引用
    Object.keys(videoRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete videoRefs.current[clipId];
        console.log(`🗑️ 清理无效的视频引用: ${clipId}`);
      }
    });

    // 清理无效的音频引用
    Object.keys(audioRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete audioRefs.current[clipId];
        console.log(`🗑️ 清理无效的音频引用: ${clipId}`);
      }
    });

    // 清理无效的文字引用
    Object.keys(textRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete textRefs.current[clipId];
        console.log(`🗑️ 清理无效的文字引用: ${clipId}`);
      }
    });
  }, [clips]);

  // 调试日志
  console.log("PreviewCanvas render:", {
    canvasSize,
    containerSize,
    canvasRatio,
    activeClipsCount: activeClips.length,
    selectedClipId,
  });

  // 视频和音频同步逻辑
  useEffect(() => {
    // 计算时间映射：播放头被限制，需要映射到完整时间范围
    const maxClipEnd =
      clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
    const playheadWidthTime = 2 / 100; // 播放头宽度对应的时间（约0.02秒）
    const limitedMax = maxClipEnd - playheadWidthTime;

    // 将受限的 currentTime [0, limitedMax] 映射到 [0, maxClipEnd]
    const timeScale = limitedMax > 0 ? maxClipEnd / limitedMax : 1;
    const mappedCurrentTime = currentTime * timeScale;

    activeClips.forEach((clip) => {
      const media = mediaItems.find((item) => item.id === clip.mediaId);

      // 视频处理
      if (media && media.type === "video") {
        const videoElement = videoRefs.current[clip.id];
        if (videoElement) {
          const timelineTime = mappedCurrentTime - clip.start;
          const clipDuration = clip.end - clip.start;

          const trimStart = clip.trimStart || 0;
          const clipDurationForTrim = clip.end - clip.start;
          const trimEnd =
            clip.trimEnd ||
            (media.duration ? media.duration : trimStart + clipDurationForTrim);

          if (timelineTime >= 0 && timelineTime <= clipDuration) {
            const videoTime = trimStart + timelineTime;
            const clampedVideoTime = Math.min(
              Math.max(trimStart, videoTime),
              trimEnd
            );

            videoElement.playbackRate = 1.0;

            if (Math.abs(videoElement.currentTime - clampedVideoTime) > 0.1) {
              videoElement.currentTime = clampedVideoTime;
            }
          }

          if (isPlaying && timelineTime >= 0 && timelineTime <= clipDuration) {
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                console.log("Video autoplay was prevented");
              });
            }
          } else {
            videoElement.pause();
          }
        }
      }

      // 音频处理
      if (media && media.type === "audio") {
        const audioElement = audioRefs.current[clip.id];
        if (audioElement) {
          const timelineTime = mappedCurrentTime - clip.start;
          const clipDuration = clip.end - clip.start;

          const trimStart = clip.trimStart || 0;
          const clipDurationForTrim = clip.end - clip.start;
          const trimEnd =
            clip.trimEnd ||
            (media.duration ? media.duration : trimStart + clipDurationForTrim);
          const audioSpeed = clip.speed || 1;
          const audioVolume = clip.volume ?? 100;

          // 设置播放速度
          audioElement.playbackRate = audioSpeed;

          // 设置音量 (HTMLMediaElement.volume 必须在 [0, 1] 范围内)
          audioElement.volume = Math.min(Math.max(audioVolume / 100, 0), 1);

          if (timelineTime >= 0 && timelineTime <= clipDuration) {
            const audioTime = trimStart + timelineTime;
            const clampedAudioTime = Math.min(
              Math.max(trimStart, audioTime),
              trimEnd
            );

            if (Math.abs(audioElement.currentTime - clampedAudioTime) > 0.1) {
              audioElement.currentTime = clampedAudioTime;
            }
          }

          if (isPlaying && timelineTime >= 0 && timelineTime <= clipDuration) {
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                console.log("Audio autoplay was prevented");
              });
            }
          } else {
            audioElement.pause();
          }
        }
      }
    });
  }, [currentTime, isPlaying, activeClips, mediaItems, clips]);

  return (
    <>
      <style>
        {`
          /* 控制框边框 */
          .moveable-control .moveable-control-box {
            border: 2px solid #4F46E5 !important;
          }
          
          /* 边线 */
          .moveable-control .moveable-line {
            background-color: #4F46E5 !important;
          }
          
          /* 控制点基础样式 */
          .moveable-control .moveable-direction {
            width: 10px !important;
            height: 10px !important;
            background-color: #ffffff !important;
            border: 2px solid #4F46E5 !important;
            border-radius: 50% !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
          }
          
          /* 旋转控制点 */
          .moveable-control .moveable-rotation {
            width: 24px !important;
            height: 24px !important;
            background-color: #ffffff !important;
            border: 2px solid #4F46E5 !important;
            border-radius: 50% !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
            cursor: grab !important;
          }
          
          .moveable-control .moveable-rotation:hover {
            background-color: #4F46E5 !important;
            transform: scale(1.1) !important;
            transition: all 0.2s ease !important;
          }
          
          /* 控制点悬停效果 */
          .moveable-control .moveable-direction:hover {
            background-color: #4F46E5 !important;
            transform: scale(1.2) !important;
            transition: all 0.2s ease !important;
          }
          
          /* 文字控制框的右中控制点变成长方形 */
          .moveable-control-text .moveable-direction.moveable-e {
            width: 10px !important;
            height: 20px !important;
            border-radius: 5px !important;
            margin-left: -6px !important;
            margin-top: -10px !important;
          }
          
          /* 媒体控制框的角控制点放大 */
          .moveable-control-media .moveable-direction.moveable-nw,
          .moveable-control-media .moveable-direction.moveable-ne,
          .moveable-control-media .moveable-direction.moveable-sw,
          .moveable-control-media .moveable-direction.moveable-se {
            width: 12px !important;
            height: 12px !important;
          }
        `}
      </style>
      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-full h-full overflow-hidden bg-gray-200"
      >
        {/* 可缩放移动的整个画布区域 */}
        <ZoomPanWrapper
          disabled={false}
          minScale={0.1}
          maxScale={5}
          initialScale={1}
          canvasRatio={canvasRatio}
          onTransformChange={(transform) => {
            console.log("Transform changed:", transform);
          }}
          onClick={() => {
            // 点击画布背景（非拖动）时取消选中
            console.log("🖱️ 点击画布背景，取消选中");
            onClipSelect?.(null);
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div
              className="relative"
              style={{
                width: canvasSize.width > 0 ? `${canvasSize.width}px` : "100%",
                height:
                  canvasSize.height > 0 ? `${canvasSize.height}px` : "100%",
                minWidth: "100px",
                minHeight: "100px",
              }}
            >
              {/* 黑色画布背景 */}
              <div
                id="preview-canvas-bg"
                data-width={canvasSize.width}
                data-height={canvasSize.height}
                className="absolute bg-black"
                style={{
                  width: "100%",
                  height: "100%",
                  zIndex: -1,
                }}
              />

              {/* 画布外层容器：实际显示尺寸 */}
              <div
                className="relative overflow-hidden"
                style={{
                  width: `${canvasSize.width}px`,
                  height: `${canvasSize.height}px`,
                }}
              >
                {/* 画布内容层：固定 1920x1080，通过 scale 缩放到实际尺寸 */}
                <div
                  ref={canvasRef}
                  id="preview-canvas"
                  className="relative"
                  style={{
                    width: "1920px",
                    height: "1080px",
                    transform: `scale(${canvasSize.width / 1920})`,
                    transformOrigin: "top left",
                  }}
                >
                  {/* 音频元素：不显示但需要播放声音 */}
                  {activeClips
                    .filter((clip) => {
                      const media = mediaItems.find(
                        (item) => item.id === clip.mediaId
                      );
                      return media?.type === "audio";
                    })
                    .map((clip) => {
                      const media = mediaItems.find(
                        (item) => item.id === clip.mediaId
                      );
                      if (!media) return null;

                      return (
                        <audio
                          key={clip.id}
                          ref={(el) => {
                            if (el) {
                              audioRefs.current[clip.id] = el;
                              // 应用音频样式
                              if (clip.volume !== undefined) {
                                // HTMLMediaElement.volume 必须在 [0, 1] 范围内
                                el.volume = Math.min(clip.volume / 100, 1);
                              }
                              if (clip.speed !== undefined) {
                                el.playbackRate = clip.speed;
                              }
                            }
                          }}
                          src={media.url}
                          style={{ display: "none" }}
                        />
                      );
                    })}

                  {/* 视觉元素：按轨道顺序显示 */}
                  {activeClips
                    .sort((a, b) => b.trackIndex - a.trackIndex)
                    .map((clip) => {
                      const media = mediaItems.find(
                        (item) => item.id === clip.mediaId
                      );
                      if (!media || media.type === "audio") return null;

                      return (
                        <React.Fragment key={clip.id}>
                          <MediaElement
                            clip={clip}
                            media={media}
                            canvasSize={{ width: 1920, height: 1080 }}
                            selectedClipId={selectedClipId}
                            isEditingRef={isEditingRef}
                            textRefs={textRefs}
                            videoRefs={videoRefs}
                            onClipSelect={onClipSelect}
                            onClipUpdate={onClipUpdate}
                          />
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Moveable 控制框 - 现在也在可缩放区域内 */}
                {activeClips
                  .filter((clip) => {
                    const media = mediaItems.find(
                      (item) => item.id === clip.mediaId
                    );
                    return (
                      media &&
                      media.type !== "audio" &&
                      selectedClipId === clip.id
                    );
                  })
                  .map((clip) => {
                    const media = mediaItems.find(
                      (item) => item.id === clip.mediaId
                    );
                    if (!media) return null;

                    console.log("Rendering MoveableControl for clip:", clip.id);

                    // 生成包含裁剪信息和尺寸的 key，确保裁剪后 MoveableControl 重新挂载
                    const cropKey = clip.cropArea
                      ? `crop-${clip.cropArea.x}-${clip.cropArea.y}-${clip.cropArea.width}-${clip.cropArea.height}`
                      : "no-crop";
                    const moveableKey = `${clip.id}-${cropKey}-${clip.width}-${clip.height}`;

                    return (
                      <MoveableControl
                        key={moveableKey}
                        clip={clip}
                        media={media}
                        canvasSize={{ width: 1920, height: 1080 }}
                        onClipUpdate={onClipUpdate}
                      />
                    );
                  })}
              </div>
              {/* 关闭画布内容层 */}
            </div>
            {/* 关闭画布外层容器 */}
          </div>
        </ZoomPanWrapper>
      </div>
    </>
  );
};

// 自定义比较函数，确保 clips 变化时重新渲染
const arePropsEqual = (
  prevProps: PreviewCanvasProps,
  nextProps: PreviewCanvasProps
) => {
  // clips 数组引用或长度变化时，必须重新渲染
  const clipsChanged =
    prevProps.clips !== nextProps.clips ||
    prevProps.clips.length !== nextProps.clips.length;

  if (clipsChanged) {
    console.log("🔄 [PreviewCanvas] clips 变化，强制重新渲染", {
      prevLength: prevProps.clips.length,
      nextLength: nextProps.clips.length,
      相同引用: prevProps.clips === nextProps.clips,
    });
    return false; // 需要重新渲染
  }

  // 其他 props 比较
  return (
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.canvasRatio === nextProps.canvasRatio &&
    prevProps.selectedClipId === nextProps.selectedClipId &&
    prevProps.mediaItems === nextProps.mediaItems
  );
};

export const PreviewCanvas = React.memo(PreviewCanvasComponent, arePropsEqual);
