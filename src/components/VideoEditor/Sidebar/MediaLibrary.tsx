import React from "react";
import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
  VideoCameraOutlined,
  FileImageOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { MediaItem, TimelineClip } from "../types";
import { ThinScrollbar } from "../utils/Scrollbar";

interface MediaLibraryProps {
  mediaItems: MediaItem[];
  onMediaRemove: (id: string) => void;
  onAddToTimeline: (clip: TimelineClip) => void;
  existingClips?: TimelineClip[];
  useScrollbar?: boolean; // 是否使用ThinScrollbar
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
}) => {
  const { t } = useTranslation();

  const handleAddToTimeline = (media: MediaItem) => {
    // 对于文本和图片使用默认5秒，视频和音频如果没有duration则也使用5秒
    const mediaDuration = media.duration || 5;

    // 固定添加到轨道0（最顶层）
    const clip: any = {
      id: `clip-${Date.now()}-${Math.random()}`,
      mediaId: media.id,
      start: 0,
      end: mediaDuration,
      trackIndex: 0,
      trimStart: 0, // 从视频开头播放
      trimEnd: mediaDuration, // 播放到视频结尾
    };

    // 获取画布尺寸（基准尺寸1920x1080）
    const canvasWidth = 1920;
    const canvasHeight = 1080;

    // 如果是文字元素，设置初始属性
    if (media.type === "text") {
      clip.text = "Text";
      clip.width = 200; // 设置初始宽度，使右中控制点可以工作
      clip.height = 60; // 设置初始高度
      // 设置默认位置（居中）
      clip.x = (canvasWidth - clip.width) / 2;
      clip.y = (canvasHeight - clip.height) / 2;
    }

    // 如果是图片或视频，设置初始宽高以保持原始宽高比
    if (
      (media.type === "image" || media.type === "video") &&
      media.width &&
      media.height
    ) {
      const targetWidth = canvasWidth * 0.5; // 目标宽度：50%画布
      const targetHeight = canvasHeight * 0.5; // 目标高度：50%画布
      const mediaRatio = media.width / media.height;
      const targetRatio = targetWidth / targetHeight;

      // 统一按目标尺寸计算，保持宽高比
      if (mediaRatio > targetRatio) {
        // 图片更宽，以宽度为准
        clip.width = targetWidth;
        clip.height = targetWidth / mediaRatio;
      } else {
        // 图片更高，以高度为准
        clip.height = targetHeight;
        clip.width = targetHeight * mediaRatio;
      }

      // 设置默认位置（居中）
      clip.x = (canvasWidth - clip.width) / 2;
      clip.y = (canvasHeight - clip.height) / 2;
    }

    onAddToTimeline(clip);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video":
        return <VideoCameraOutlined className="text-xl text-blue-500" />;
      case "audio":
        return (
          <img
            src={require("../../../assets/music.png")}
            alt="music"
            className="w-4 h-4"
          />
        );
      case "image":
        return <FileImageOutlined className="text-xl text-purple-500" />;
      case "text":
        return <FileTextOutlined className="text-xl text-purple-600" />;
      default:
        return null;
    }
  };

  const content = (
    <div className="p-3">
      {mediaItems.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-400">
          <p className="text-sm">{t("mediaLibrary.noMedia")}</p>
          <p className="mt-2 text-xs">{t("mediaLibrary.uploadPrompt")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              className={`relative overflow-hidden transition-all border border-gray-200 rounded cursor-pointer group hover:border-blue-400 ${
                item.type === "video" || item.type === "image"
                  ? "w-5/5"
                  : "w-full"
              }`}
              onClick={() => handleAddToTimeline(item)}
            >
              {/* 缩略图 */}
              <div
                className={`relative bg-gray-100 ${
                  item.type === "audio" ? "h-14" : "aspect-video"
                }`}
              >
                {item.type === "video" ? (
                  // 视频直接使用 thumbnail 字段
                  <img
                    src={item.thumbnail || item.url}
                    alt={item.name}
                    className="object-cover w-full h-full"
                  />
                ) : item.type === "image" ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="object-cover w-full h-full"
                  />
                ) : item.type === "audio" ? (
                  // 音频只显示图标和文件名
                  <div className="flex items-center w-full h-full bg-white">
                    <div
                      className="flex items-center justify-center text-2xl text-gray-600 w-14 h-14 shrink-0"
                      style={{ backgroundColor: "#F4F4F5" }}
                    >
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0 px-4 text-sm font-medium text-gray-700">
                      <div className="truncate" title={item.name}>
                        {item.name}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gray-50">
                    {getIcon(item.type)}
                  </div>
                )}

                {/* 时长标签 */}
                {item.duration && (
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-2 py-0.5 rounded">
                    {formatDuration(item.duration)}
                  </div>
                )}
              </div>

              {/* 文件名（音频已在卡片内显示，不重复显示） */}
              {item.type !== "audio" && (
                <div className="p-2">
                  <Tooltip title={item.name}>
                    <p className="text-xs text-gray-700 truncate">
                      {item.name}
                    </p>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
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
