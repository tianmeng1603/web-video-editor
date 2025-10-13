import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { MediaItem } from "../types";
import { getAudioDuration, getImageDimensions } from "../utils/mediaProcessor";

interface MediaUploaderProps {
  onMediaAdd: (item: MediaItem) => void;
}

// 服务器返回的上传结果
interface UploadResult {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  url: string;
}

// 模拟上传到服务器的函数
const uploadToServer = async (file: File): Promise<UploadResult> => {
  // 模拟上传延迟
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 根据文件类型确定素材类型
  const type = file.type.startsWith("video/")
    ? "video"
    : file.type.startsWith("audio/")
    ? "audio"
    : "image";

  // 返回服务器的完整响应数据
  return {
    id: `media-${type}-${Date.now()}`,
    name: file.name,
    type: type as "video" | "audio" | "image",
    url: "https://vod.pipi.cn/fe5b84bcvodcq1251246104/658e4b085285890797861659749/f0.mp4",
  };
};

const MediaUploaderComponent: React.FC<MediaUploaderProps> = ({
  onMediaAdd,
}) => {
  const { t } = useTranslation();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(async (file) => {
        // 上传到服务器获取完整的媒体信息
        const uploadResult = await uploadToServer(file);
        console.log("📤 文件上传成功:", uploadResult);

        // 处理不同类型的媒体
        if (uploadResult.type === "video") {
          // 视频：不生成封面，thumbnail 为空
          const mediaItem: MediaItem = {
            id: uploadResult.id,
            name: uploadResult.name,
            type: uploadResult.type,
            url: uploadResult.url,
            file: new File([], uploadResult.name),
            thumbnail: undefined, // 不生成封面
            duration: undefined,
            width: undefined,
            height: undefined,
          };
          onMediaAdd(mediaItem);
          message.success(t("mediaLibrary.videoAdded"));
        } else if (uploadResult.type === "audio") {
          // 音频：只获取时长（波形图使用静态图片）
          const duration = await getAudioDuration(uploadResult.url);
          const mediaItem: MediaItem = {
            id: uploadResult.id,
            name: uploadResult.name,
            type: uploadResult.type,
            url: uploadResult.url,
            file: new File([], uploadResult.name),
            duration,
          };
          onMediaAdd(mediaItem);
          message.success(t("mediaLibrary.audioAdded"));
        } else if (uploadResult.type === "image") {
          // 图片：获取原始尺寸
          const { width, height } = await getImageDimensions(uploadResult.url);
          const mediaItem: MediaItem = {
            id: uploadResult.id,
            name: uploadResult.name,
            type: uploadResult.type,
            url: uploadResult.url,
            file: new File([], uploadResult.name),
            width,
            height,
          };
          onMediaAdd(mediaItem);
          message.success(t("mediaLibrary.imageAdded"));
        }
      });
    },
    [onMediaAdd, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  return (
    <div className="space-y-4">
      {/* 文件拖拽上传区域 */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {isDragActive ? (
            <p className="text-sm font-medium text-blue-500">
              {t("mediaLibrary.releaseFile")}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">
                {t("mediaLibrary.dragDrop")}
              </p>
              <p className="text-xs text-gray-500">
                {t("mediaLibrary.clickToSelect")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const MediaUploader = React.memo(MediaUploaderComponent);
