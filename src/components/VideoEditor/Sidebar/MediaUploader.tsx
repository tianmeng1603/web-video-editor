import React from "react";
import { message, Upload } from "antd";
import { useTranslation } from "react-i18next";
import type { UploadProps } from "antd";
import { MediaItem } from "../types";

interface MediaUploaderProps {
  onMediaAdd: (item: MediaItem) => void;
}

// 服务器返回的上传结果
interface UploadResult {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  url: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileInfo: {
    name: string;
    type: string;
    size: number;
  };
}

// 生成固定的缩略图（灰色占位图）
const generatePlaceholderThumbnail = (
  width: number = 400,
  height: number = 300
): string => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // 灰色背景
    ctx.fillStyle = "#E5E7EB";
    ctx.fillRect(0, 0, width, height);

    // 添加图标
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📹", width / 2, height / 2);
  }

  return canvas.toDataURL("image/jpeg", 0.8);
};

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

  console.log(type, "typetypetype");

  // 根据类型返回不同的数据
  if (type === "video") {
    return {
      id: `media-${type}-${Date.now()}`,
      name: file.name,
      type: type as "video" | "audio" | "image",
      url: "https://vod.pipi.cn/fe5b84bcvodcq1251246104/658e4b085285890797861659749/f0.mp4",
      thumbnail: generatePlaceholderThumbnail(852, 480), // 固定的视频缩略图
      duration: 124.052993, // 固定时长（参考 mockProject.json）
      width: 395,
      height: 222,
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size,
      },
    };
  } else if (type === "audio") {
    return {
      id: `media-${type}-${Date.now()}`,
      name: file.name,
      type: type as "video" | "audio" | "image",
      url: "https://web-ext-storage.dcloud.net.cn/uni-app/ForElise.mp3",
      duration: 180.5, // 固定音频时长
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size,
      },
    };
  } else {
    // 图片
    return {
      id: `media-${type}-${Date.now()}`,
      name: file.name,
      type: type as "video" | "audio" | "image",
      url: "https://qiniu-web-assets.dcloud.net.cn/unidoc/zh/shuijiao.jpg",
      thumbnail: generatePlaceholderThumbnail(200, 200), // 图片缩略图（与实际尺寸匹配）
      width: 499,
      height: 332,
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size,
      },
    };
  }
};

const MediaUploaderComponent: React.FC<MediaUploaderProps> = ({
  onMediaAdd,
}) => {
  const { t } = useTranslation();

  // 自定义上传逻辑
  const customRequest: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    const uploadFile = file as File;

    try {
      // 上传到服务器获取完整的媒体信息
      const uploadResult = await uploadToServer(uploadFile);
      console.log("📤 文件上传成功:", uploadResult);

      // 直接使用服务器返回的完整数据创建媒体项
      const mediaItem: MediaItem = {
        id: uploadResult.id,
        name: uploadResult.name,
        type: uploadResult.type,
        url: uploadResult.url,
        file: uploadFile,
        thumbnail: uploadResult.thumbnail,
        duration: uploadResult.duration,
        width: uploadResult.width,
        height: uploadResult.height,
      };

      onMediaAdd(mediaItem);

      // 根据类型显示成功消息
      if (uploadResult.type === "video") {
        message.success(t("mediaLibrary.videoAdded"));
      } else if (uploadResult.type === "audio") {
        message.success(t("mediaLibrary.audioAdded"));
      } else if (uploadResult.type === "image") {
        message.success(t("mediaLibrary.imageAdded"));
      }

      onSuccess?.(uploadResult);
    } catch (error) {
      console.error("文件上传失败:", error);
      message.error(t("mediaLibrary.uploadFailed") || "上传失败");
      onError?.(error as Error);
    }
  };

  const { Dragger } = Upload;

  return (
    <Dragger
      customRequest={customRequest}
      showUploadList={false}
      accept="video/*,audio/*,image/*"
      multiple={true}
      style={{ borderRadius: "4px" }}
    >
      <p
        className="ant-upload-drag-icon"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ width: "32px", height: "32px", color: "#9CA3AF" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </p>
      <p className="ant-upload-text" style={{ fontSize: "12px" }}>
        {t("mediaLibrary.dragDrop")}
      </p>
      <p className="ant-upload-hint" style={{ fontSize: "12px" }}>
        {t("mediaLibrary.clickToSelect")}
      </p>
    </Dragger>
  );
};

export const MediaUploader = React.memo(MediaUploaderComponent);
