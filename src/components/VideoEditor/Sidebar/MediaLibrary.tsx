import React, { useState } from "react";
import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
  VideoCameraOutlined,
  FileImageOutlined,
  FileTextOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { MediaItem, TimelineClip } from "../types";
import { ThinScrollbar } from "../utils/Scrollbar";
import { createTextClip } from "./LeftPanel";

interface MediaLibraryProps {
  mediaItems: MediaItem[];
  onMediaRemove: (id: string) => void;
  onAddToTimeline: (clip: TimelineClip) => void;
  existingClips?: TimelineClip[];
  useScrollbar?: boolean; // 是否使用ThinScrollbar
  currentTime?: number; // 当前播放头位置
}

// 格式化时长显示
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    // 小于1分钟，显示秒
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    // 小于1小时，显示分:秒
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  } else {
    // 大于等于1小时，显示时:分:秒
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
};

const MediaLibraryComponent: React.FC<MediaLibraryProps> = ({
  mediaItems,
  onMediaRemove,
  onAddToTimeline,
  existingClips = [],
  useScrollbar = true,
  currentTime = 0,
}) => {
  const { t } = useTranslation();

  // 管理每个媒体项的加载状态（使用媒体ID作为key）
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

  // 处理添加到时间轴
  const handleAddToTimeline = (media: MediaItem) => {
    // 文本类型使用专门的函数
    if (media.type === "text") {
      createTextClip(
        media.text || "Text",
        mediaItems,
        onAddToTimeline,
        currentTime
      );
      return;
    }

    // 创建片段基础信息
    const mediaDuration = media.duration || 5;
    const clip: any = {
      id: `clip-${Date.now()}-${Math.random()}`,
      mediaId: media.id,
      type: media.type, // 添加类型字段
      start: currentTime,
      end: currentTime + mediaDuration,
      trackIndex: 0,
      trimStart: 0,
      trimEnd: mediaDuration,
    };

    // 图片或视频：计算初始尺寸和位置
    if (
      (media.type === "image" || media.type === "video") &&
      media.width &&
      media.height
    ) {
      const CANVAS_WIDTH = 1920;
      const CANVAS_HEIGHT = 1080;
      const targetWidth = CANVAS_WIDTH * 0.5;
      const targetHeight = CANVAS_HEIGHT * 0.5;
      const mediaRatio = media.width / media.height;
      const targetRatio = targetWidth / targetHeight;

      // 保持宽高比
      if (mediaRatio > targetRatio) {
        clip.width = targetWidth;
        clip.height = targetWidth / mediaRatio;
      } else {
        clip.height = targetHeight;
        clip.width = targetHeight * mediaRatio;
      }

      // 居中位置
      clip.x = (CANVAS_WIDTH - clip.width) / 2;
      clip.y = (CANVAS_HEIGHT - clip.height) / 2;
    }

    onAddToTimeline(clip);
  };

  // 渲染媒体项图标
  const renderIcon = (type: string) => {
    const iconMap = {
      video: <VideoCameraOutlined className="text-lg text-blue-500" />,
      audio: (
        <img
          src={require("../../../assets/music.png")}
          alt="music"
          className="w-3.5 h-3.5"
        />
      ),
      image: <FileImageOutlined className="text-lg text-purple-500" />,
      text: <FileTextOutlined className="text-lg text-purple-600" />,
    };
    return iconMap[type as keyof typeof iconMap] || null;
  };

  // 设置媒体项的加载状态
  const setMediaLoading = (mediaId: string, isLoading: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [mediaId]: isLoading,
    }));
  };

  // 获取媒体项的加载状态（默认为true表示加载中）
  const isMediaLoading = (mediaId: string, mediaType: string): boolean => {
    // 只有图片和视频需要加载状态
    if (mediaType !== "image" && mediaType !== "video") {
      return false;
    }
    // 如果状态未初始化，默认为加载中
    return loadingStates[mediaId] !== false;
  };

  // 渲染媒体项预览内容
  const renderMediaPreview = (item: MediaItem) => {
    const previewHeight =
      item.type === "audio"
        ? ""
        : item.type === "text"
        ? "h-full"
        : "aspect-video";

    const isLoading = isMediaLoading(item.id, item.type);

    return (
      <div
        className={`relative bg-gray-100 ${previewHeight}`}
        style={
          item.type === "image" || item.type === "video"
            ? { minHeight: "100px" }
            : undefined
        }
      >
        {/* Loading 背景 - 只在图片和视频加载时显示 */}
        {isLoading && (item.type === "image" || item.type === "video") && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundColor: "#E5E5E5",
              zIndex: 1,
            }}
          >
            <LoadingOutlined style={{ fontSize: 24, color: "#999" }} />
          </div>
        )}

        {/* 视频预览 */}
        {item.type === "video" && (
          <img
            src={item.thumbnail || item.url}
            alt={item.name}
            className="object-cover w-full h-full"
            style={{ opacity: isLoading ? 0 : 1 }}
            onLoad={() => setMediaLoading(item.id, false)}
            onError={() => setMediaLoading(item.id, false)}
          />
        )}

        {/* 图片预览 */}
        {item.type === "image" && (
          <img
            src={item.url}
            alt={item.name}
            className="object-cover w-full h-full"
            style={{ opacity: isLoading ? 0 : 1 }}
            onLoad={() => setMediaLoading(item.id, false)}
            onError={() => setMediaLoading(item.id, false)}
          />
        )}

        {/* 音频预览 */}
        {item.type === "audio" && (
          <div
            className="flex items-center w-full bg-white"
            style={{ height: "40px" }}
          >
            <div
              className="flex items-center justify-center text-xl text-gray-600 shrink-0"
              style={{
                backgroundColor: "#F4F4F5",
                width: "40px",
                height: "40px",
              }}
            >
              {renderIcon(item.type)}
            </div>
            <div
              className="flex-1 min-w-0 font-medium text-gray-700"
              style={{
                fontSize: "12px",
                paddingLeft: "10px",
                paddingRight: "10px",
              }}
            >
              <div className="truncate" title={item.name}>
                {item.name}
              </div>
            </div>
          </div>
        )}

        {/* 文字预览 */}
        {item.type === "text" && (
          <div className="flex items-center w-full h-full bg-gray-50">
            <div
              className="text-left text-gray-700 break-words"
              style={{ fontSize: "12px", padding: "10px" }}
            >
              {item.text || ""}
            </div>
          </div>
        )}

        {/* 时长标签 */}
        {item.duration && (
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-2 py-0.5 rounded">
            {formatDuration(item.duration)}
          </div>
        )}
      </div>
    );
  };

  const content = (
    <div style={{ padding: "10px" }}>
      {mediaItems.length === 0 ? (
        <div
          style={{ padding: "10px 10px 20px 10px" }}
          className="text-center text-gray-400"
        >
          <p style={{ fontSize: "12px" }}>{t("mediaLibrary.noMedia")}</p>
          <p style={{ marginTop: "10px" }} className="text-xs">
            {t("mediaLibrary.uploadPrompt")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mediaItems.map((item) => {
            const itemHeight = item.type === "text" ? "" : "";
            const itemStyle = item.type === "text" ? { height: "26px" } : {};

            return (
              <div
                key={item.id}
                className={`relative overflow-hidden transition-all border border-gray-200 cursor-pointer group hover:border-blue-400 w-full ${itemHeight}`}
                style={{ ...itemStyle, borderRadius: "4px" }}
                onClick={() => handleAddToTimeline(item)}
              >
                {renderMediaPreview(item)}

                {/* 文件名（音频和文字已在卡片内显示，不重复显示） */}
                {item.type !== "audio" && item.type !== "text" && (
                  <div style={{ padding: "5px 10px" }}>
                    <Tooltip title={item.name || ""}>
                      <p className="text-xs text-gray-700 truncate">
                        {item.name || ""}
                      </p>
                    </Tooltip>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return useScrollbar ? (
    <ThinScrollbar>{content}</ThinScrollbar>
  ) : (
    <div className="h-full">{content}</div>
  );
};

export const MediaLibrary = React.memo(MediaLibraryComponent);
