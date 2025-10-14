import React, { useEffect, useRef } from "react";
import { MediaItem, TimelineClip } from "../types";

interface MediaElementProps {
  clip: TimelineClip;
  media: MediaItem;
  canvasSize: { width: number; height: number };
  selectedClipId?: string | null;
  isEditingRef: React.RefObject<Set<string>>;
  textRefs: React.RefObject<{ [key: string]: HTMLDivElement }>;
  videoRefs: React.RefObject<{ [key: string]: HTMLVideoElement }>;
  onClipSelect?: (id: string | null) => void;
  onClipUpdate?: (
    id: string,
    updates: Partial<TimelineClip>,
    options?: { skipHistory?: boolean; immediate?: boolean }
  ) => void;
}

const MediaElementComponent: React.FC<MediaElementProps> = ({
  clip,
  media,
  canvasSize,
  selectedClipId,
  isEditingRef,
  textRefs,
  videoRefs,
  onClipSelect,
  onClipUpdate,
}) => {
  const isText = media.type === "text";

  // 当文字内容变化时，更新 DOM（用于撤销/重做）
  useEffect(() => {
    console.log(
      `🔍 useEffect 触发 - clip.id: ${clip.id}, clip.text: "${clip.text}"`
    );

    if (media.type === "text") {
      const textElement = textRefs.current?.[clip.id];
      console.log(`  textElement 存在: ${!!textElement}`);

      if (textElement) {
        const isEditing = isEditingRef.current?.has(clip.id);
        const currentText = textElement.innerText || "";
        const newText = clip.text || "Text";

        console.log(
          `  isEditing: ${isEditing}, currentText: "${currentText}", newText: "${newText}"`
        );

        // 只在不处于编辑状态时更新
        if (!isEditing && currentText !== newText) {
          textElement.innerText = newText;
          console.log(`  ✅ PreviewCanvas 文字已更新`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.text, clip.id, media.type]);

  // 当文字内容变化时，如果文本框还没有设置过宽高（首次创建），自动计算初始宽高
  useEffect(() => {
    if (media.type === "text" && onClipUpdate) {
      const textElement = textRefs.current?.[clip.id];
      const parent = textElement?.parentElement as HTMLDivElement;

      // 只有在宽高未设置时才自动计算（首次创建文本时）
      const hasManualSize =
        clip.width !== undefined && clip.height !== undefined;

      if (
        textElement &&
        parent &&
        !isEditingRef.current?.has(clip.id) &&
        !hasManualSize
      ) {
        // 临时设置宽高为 auto 以获取实际内容尺寸
        const originalWidth = parent.style.width;
        const originalHeight = parent.style.height;
        parent.style.width = "auto";
        parent.style.height = "auto";

        // 获取实际内容宽高（添加一些内边距）
        const newWidth = Math.max(parent.offsetWidth + 20, 120);
        const newHeight = Math.max(parent.offsetHeight, 40);

        // 恢复原始尺寸样式
        parent.style.width = originalWidth;
        parent.style.height = originalHeight;

        // 设置初始宽高
        onClipUpdate(
          clip.id,
          {
            width: newWidth,
            height: newHeight,
          },
          {
            skipHistory: true,
            immediate: true,
          }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.text, clip.id, media.type]);

  // 追踪上一次的字号和尺寸，用于判断变化来源
  const prevStateRef = useRef({
    fontSize: clip.textStyle?.fontSize,
    width: clip.width,
    height: clip.height,
  });

  // 当通过右侧面板修改字号时，通过缩放比例调整控制框大小
  useEffect(() => {
    if (media.type === "text" && onClipUpdate && clip.textStyle?.fontSize) {
      const prevState = prevStateRef.current;
      const currentFontSize = clip.textStyle.fontSize;
      const currentWidth = clip.width;
      const currentHeight = clip.height;

      // 检查是否只有字号变化了（宽高没有同时变化）
      // 如果宽高也同时变化了，说明是通过缩放控制框改变的，不需要再次调整
      const onlyFontSizeChanged =
        prevState.fontSize !== undefined &&
        currentFontSize !== prevState.fontSize &&
        currentWidth === prevState.width &&
        currentHeight === prevState.height;

      if (onlyFontSizeChanged && prevState.fontSize) {
        // 计算字号的缩放比例
        const fontScaleRatio = currentFontSize / prevState.fontSize;

        // 获取当前的宽高（如果没有设置则使用默认值）
        const oldWidth = currentWidth || 120;
        const oldHeight = currentHeight || 40;

        // 根据字号缩放比例，同比例缩放控制框
        const newWidth = Math.round(oldWidth * fontScaleRatio);
        const newHeight = Math.round(oldHeight * fontScaleRatio);

        // 更新控制框大小
        onClipUpdate(
          clip.id,
          {
            width: newWidth,
            height: newHeight,
          },
          {
            skipHistory: false,
          }
        );

        // 更新追踪状态
        prevStateRef.current = {
          fontSize: currentFontSize,
          width: newWidth,
          height: newHeight,
        };
      } else {
        // 更新追踪状态（即使不调整，也要更新状态）
        prevStateRef.current = {
          fontSize: currentFontSize,
          width: currentWidth,
          height: currentHeight,
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.textStyle?.fontSize, clip.width, clip.height, clip.id, media.type]);

  // 根据素材原始比例计算默认尺寸
  let defaultWidth: number | "auto" = "auto";
  let defaultHeight: number | "auto" = "auto";

  if (!isText && media.width && media.height) {
    const mediaRatio = media.width / media.height;
    const maxWidth = canvasSize.width * 0.8;
    const maxHeight = canvasSize.height * 0.8;

    if (media.width > maxWidth || media.height > maxHeight) {
      if (mediaRatio > maxWidth / maxHeight) {
        defaultWidth = maxWidth;
        defaultHeight = maxWidth / mediaRatio;
      } else {
        defaultHeight = maxHeight;
        defaultWidth = maxHeight * mediaRatio;
      }
    } else {
      defaultWidth = media.width;
      defaultHeight = media.height;
    }
  } else if (!isText) {
    defaultWidth = canvasSize.width * 0.8;
    defaultHeight = canvasSize.height * 0.8;
  }

  const defaultTextWidth = 120;
  const defaultTextHeight = 40;

  const defaultX = isText
    ? canvasSize.width / 2 - defaultTextWidth / 2
    : (canvasSize.width - (defaultWidth as number)) / 2;
  const defaultY = isText
    ? canvasSize.height / 2 - defaultTextHeight / 2
    : (canvasSize.height - (defaultHeight as number)) / 2;

  const x = clip.x ?? defaultX;
  const y = clip.y ?? defaultY;
  const width =
    clip.width ??
    (typeof defaultWidth === "number"
      ? defaultWidth
      : isText
      ? defaultTextWidth
      : 100);
  const height =
    clip.height ??
    (typeof defaultHeight === "number"
      ? defaultHeight
      : isText
      ? defaultTextHeight
      : 40);
  const scale = clip.scale ?? 1;
  const rotation = clip.rotation ?? 0;
  const opacity = clip.opacity ?? 100;

  // 生成文字样式
  const generateTextStyle = () => {
    const textStyle = clip.textStyle || {};
    const style: React.CSSProperties = {
      fontFamily: textStyle.fontFamily || "Arial",
      fontWeight: textStyle.fontWeight || "inherit",
      fontSize: `${textStyle.fontSize || 24}px`,
      color: textStyle.color || "#ffffff",
      textAlign: (textStyle.textAlign as any) || "center",
      textDecoration: textStyle.textDecoration || "none",
      textTransform: (textStyle.textTransform as any) || "none",
      opacity: opacity / 100,
    };

    // 字体描边
    if (textStyle.strokeColor && textStyle.strokeWidth) {
      style.WebkitTextStroke = `${textStyle.strokeWidth}px ${textStyle.strokeColor}`;
      (
        style as any
      ).textStroke = `${textStyle.strokeWidth}px ${textStyle.strokeColor}`;
    }

    // 字体阴影
    if (textStyle.shadowColor) {
      const shadowX = textStyle.shadowOffsetX || 0;
      const shadowY = textStyle.shadowOffsetY || 0;
      const shadowBlur = textStyle.shadowBlur || 0;
      style.textShadow = `${shadowX}px ${shadowY}px ${shadowBlur}px ${textStyle.shadowColor}`;
    }

    return style;
  };

  // 生成外层容器样式（应用到最外层 div）- 包含圆角、轮廓和阴影
  const generateOuterContainerStyle = () => {
    const mediaStyle = clip.mediaStyle || {};
    const style: React.CSSProperties = {};

    // 圆角
    if (mediaStyle.borderRadius) {
      style.borderRadius = `${mediaStyle.borderRadius}px`;
    }

    // 轮廓
    if (mediaStyle.outlineColor && mediaStyle.outlineWidth) {
      style.outline = `${mediaStyle.outlineWidth}px solid ${mediaStyle.outlineColor}`;
    }

    // 阴影
    if (mediaStyle.shadowColor) {
      const shadowX = mediaStyle.shadowOffsetX || 0;
      const shadowY = mediaStyle.shadowOffsetY || 0;
      const shadowBlur = mediaStyle.shadowBlur || 0;
      style.boxShadow = `${shadowX}px ${shadowY}px ${shadowBlur}px ${mediaStyle.shadowColor}`;
    }

    return style;
  };

  // 生成媒体样式（应用到内层 div）- 只包含透明度和滤镜
  const generateMediaStyle = () => {
    const mediaStyle = clip.mediaStyle || {};
    const style: React.CSSProperties = {
      opacity: opacity / 100,
    };

    // 模糊和亮度（使用CSS滤镜）
    const filters = [];
    if (mediaStyle.blur && mediaStyle.blur > 0) {
      filters.push(`blur(${mediaStyle.blur}px)`);
    }
    if (mediaStyle.brightness && mediaStyle.brightness !== 100) {
      filters.push(`brightness(${mediaStyle.brightness}%)`);
    }
    if (filters.length > 0) {
      style.filter = filters.join(" ");
    }

    return style;
  };

  // 生成裁剪样式（用于图片和视频）
  const generateCropStyle = () => {
    if (clip.cropArea && media.width && media.height) {
      const {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      } = clip.cropArea;

      // 计算缩放比例：将裁剪区域缩放到当前元素尺寸
      // 分别计算 X 和 Y 方向的缩放，以支持改变宽高比
      const scaleX = width / cropWidth;
      const scaleY = height / cropHeight;

      // 计算媒体元素的显示尺寸（原始尺寸 × 缩放比例）
      const displayWidth = media.width * scaleX;
      const displayHeight = media.height * scaleY;

      // 计算偏移量：将裁剪区域移动到容器的左上角
      const offsetX = -cropX * scaleX;
      const offsetY = -cropY * scaleY;

      console.log(`🎬 [${media.type}] 裁剪样式计算:`, {
        媒体ID: media.id,
        媒体尺寸: { width: media.width, height: media.height },
        裁剪区域: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
        元素尺寸: { width, height },
        缩放比例: { scaleX, scaleY },
        显示尺寸: { width: displayWidth, height: displayHeight },
        偏移: { x: offsetX, y: offsetY },
      });

      return {
        position: "absolute" as const,
        left: `${offsetX}px`,
        top: `${offsetY}px`,
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        display: "block",
        pointerEvents: "none" as const,
      };
    } else {
      return {
        width: "100%",
        height: "100%",
        objectFit: "contain" as const,
        display: "block",
      };
    }
  };

  // 判断是否需要 overflow: hidden（裁剪或圆角时需要）
  const needsOverflowHidden =
    !isText && (clip.cropArea || clip.mediaStyle?.borderRadius);

  return (
    <div
      id={`element-${clip.id}`}
      className="absolute"
      style={{
        transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
        width: `${width}px`,
        height: `${height}px`,
        transformOrigin: "center center",
        cursor: "move",
        zIndex: 100 - clip.trackIndex,
        overflow: needsOverflowHidden ? "hidden" : "visible",
        ...generateOuterContainerStyle(),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClipSelect?.(clip.id);
      }}
    >
      {media.type === "video" && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            ...generateMediaStyle(),
            ...(clip.cropArea ? generateCropStyle() : {}),
          }}
        >
          <video
            ref={(el) => {
              if (el) {
                videoRefs.current[clip.id] = el;
                // 设置音量，如果未定义则使用100（满音量）
                const volume = clip.volume !== undefined ? clip.volume : 100;
                // HTMLMediaElement.volume 必须在 [0, 1] 范围内，所以需要限制最大值为 1
                el.volume = Math.min(volume / 100, 1);
                // 根据音量设置静音状态
                el.muted = volume === 0;
              }
            }}
            src={media.url}
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: clip.cropArea ? "fill" : "contain",
              display: "block",
            }}
            playsInline
            preload="auto"
          />
        </div>
      )}
      {media.type === "image" && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            ...generateMediaStyle(),
            ...(clip.cropArea ? generateCropStyle() : {}),
          }}
        >
          <img
            src={media.url}
            alt={media.name}
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: clip.cropArea ? "fill" : "contain",
              display: "block",
            }}
          />
        </div>
      )}
      {media.type === "text" && (
        <div
          ref={(el) => {
            if (el) {
              textRefs.current[clip.id] = el;
              if (
                !isEditingRef.current?.has(clip.id) &&
                el.innerText !== clip.text
              ) {
                el.innerText = clip.text || "Text";
              }
            }
          }}
          contentEditable={selectedClipId === clip.id}
          className="outline-none pointer-events-auto cursor-text"
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            minWidth: "50px",
            userSelect: selectedClipId === clip.id ? "text" : "none",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            display: "block",
            ...generateTextStyle(),
          }}
          onFocus={() => {
            isEditingRef.current?.add(clip.id);
          }}
          onInput={(e) => {
            if (onClipUpdate) {
              const target = e.currentTarget as HTMLDivElement;
              const parent = target.parentElement as HTMLDivElement;

              if (!parent) return;

              // 临时设置高度为 auto 以获取实际内容高度（保持宽度不变）
              const originalHeight = parent.style.height;
              const currentHeight = clip.height || height;
              parent.style.height = "auto";

              // 获取实际内容高度
              const contentHeight = Math.max(parent.offsetHeight, 40);

              // 恢复原始高度样式
              parent.style.height = originalHeight;

              // 只在内容高度大于当前高度时才扩展，否则保持当前高度（不缩回）
              const newHeight = Math.max(contentHeight, currentHeight);

              // 使用 innerText 获取文本（保留换行符为 \n）
              // 只更新文字和高度，不改变宽度，跳过历史记录保存
              onClipUpdate(
                clip.id,
                {
                  text: target.innerText || "",
                  height: newHeight,
                },
                { skipHistory: true }
              ); // 输入过程中不保存历史记录
            }
          }}
          onBlur={(e) => {
            isEditingRef.current?.delete(clip.id);
            if (onClipUpdate) {
              const target = e.currentTarget as HTMLDivElement;
              const parent = target.parentElement as HTMLDivElement;

              if (!parent) return;

              // 临时设置高度为 auto 以获取实际内容高度（保持宽度不变）
              const originalHeight = parent.style.height;
              const currentHeight = clip.height || height;
              parent.style.height = "auto";

              // 获取实际内容高度
              const contentHeight = Math.max(parent.offsetHeight, 40);

              // 恢复原始高度样式
              parent.style.height = originalHeight;

              // 只在内容高度大于当前高度时才扩展，否则保持当前高度（不缩回）
              const newHeight = Math.max(contentHeight, currentHeight);

              // 使用 innerText 获取文本（保留换行符为 \n）
              // 只更新文字和高度，不改变宽度，失焦时立即保存历史记录
              onClipUpdate(
                clip.id,
                {
                  text: target.innerText || "",
                  height: newHeight,
                },
                { skipHistory: false, immediate: true }
              ); // 编辑结束时立即保存历史记录
            }
          }}
          onClick={(e) => {
            if (selectedClipId === clip.id) {
              e.stopPropagation();
            }
          }}
          onDoubleClick={(e) => {
            if (selectedClipId === clip.id) {
              e.stopPropagation();
              const target = e.currentTarget as HTMLDivElement;
              target.focus();
              const range = document.createRange();
              range.selectNodeContents(target);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }}
          onMouseDown={(e) => {
            if (selectedClipId === clip.id) {
              e.stopPropagation();
            }
          }}
        />
      )}
    </div>
  );
};

export const MediaElement = React.memo(MediaElementComponent);
