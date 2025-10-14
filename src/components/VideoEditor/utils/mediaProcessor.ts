/**
 * 获取视频第一帧作为封面图（包含视频元数据）
 * @param videoUrl 视频URL
 * @param seekTime 跳转时间（秒），默认0.1秒
 * @returns 包含缩略图、时长、宽度和高度的对象
 */
export function generateVideoThumbnail(
  videoUrl: string,
  seekTime: number = 0.1
): Promise<{
  thumbnail: string;
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.currentTime = seekTime;

    video.addEventListener("loadeddata", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("无法获取Canvas上下文"));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameUrl = canvas.toDataURL("image/jpeg", 0.9);

      if (!frameUrl || frameUrl.length < 100) {
        reject(new Error("封面生成失败：数据为空或过小"));
        return;
      }

      resolve({
        thumbnail: frameUrl,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    });

    video.addEventListener("error", (e) => {
      reject(new Error(`Failed to load video: ${videoUrl}`));
    });
  });
}

/**
 * 从音频URL获取时长
 * @param audioUrl 音频URL（服务器URL或本地URL）
 * @returns 音频时长（秒）
 */
export function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    
    audio.onerror = (error) => {
      console.error("❌ 音频加载失败:", error);
      reject(error);
    };
    
    audio.src = audioUrl;
  });
}



/**
 * 从图片URL获取尺寸
 * @param imageUrl 图片URL
 * @returns 包含宽度和高度的对象
 */
export function getImageDimensions(imageUrl: string): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 设置crossOrigin以避免canvas污染问题
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = (error) => {
      console.error("❌ 图片加载失败:", error);
      reject(error);
    };
    
    img.src = imageUrl;
  });
}