import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { MediaItem, TimelineClip } from "../types";

let ffmpegInstance: FFmpeg | null = null;

const getFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();
  ffmpegInstance.on('log', ({ message }) => console.log('[FFmpeg]:', message));
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpegInstance.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });

  console.log('✅ FFmpeg 加载完成');
  return ffmpegInstance;
};

export const getCanvasSize = (ratio: string) => {
  switch (ratio) {
    case "16:9": return { width: 1920, height: 1080 };
    case "9:16": return { width: 1080, height: 1920 };
    case "1:1": return { width: 1080, height: 1080 };
    default: return { width: 1920, height: 1080 };
  }
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const loadVideo = (url: string): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = reject;
  });
};

const renderSingleClip = async (
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  media: MediaItem,
  currentTime: number,
  canvasSize: { width: number; height: number }
): Promise<void> => {
  ctx.save();
  
  const rotation = (clip.rotation ?? 0) * Math.PI / 180;
  const scale = clip.scale ?? 1;
  const opacity = (clip.opacity ?? 100) / 100;
  
  try {
    if (media.type === "image") {
      const img = await loadImage(media.url);
      const width = clip.width ?? img.width;
      const height = clip.height ?? img.height;
      
      // 计算元素左上角坐标和中心点坐标
      const x = clip.x ?? (canvasSize.width - width) / 2;
      const y = clip.y ?? (canvasSize.height - height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // 应用变换（平移到中心点、旋转、缩放）- 对应外层容器的 transform
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      
      const mediaStyle = clip.mediaStyle || {};
      
      // === 步骤1: 绘制阴影 ===
      // 阴影需要通过绘制一个形状来产生，不能只设置属性
      if (mediaStyle.shadowColor && mediaStyle.shadowBlur) {
        ctx.shadowColor = mediaStyle.shadowColor;
        ctx.shadowBlur = mediaStyle.shadowBlur || 0;
        ctx.shadowOffsetX = mediaStyle.shadowOffsetX || 0;
        ctx.shadowOffsetY = mediaStyle.shadowOffsetY || 0;
        
        // 绘制一个形状来产生阴影
        if (mediaStyle.borderRadius) {
          // 有圆角：绘制圆角矩形
          const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(-width / 2 + radius, -height / 2);
          ctx.lineTo(width / 2 - radius, -height / 2);
          ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
          ctx.lineTo(width / 2, height / 2 - radius);
          ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
          ctx.lineTo(-width / 2 + radius, height / 2);
          ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
          ctx.lineTo(-width / 2, -height / 2 + radius);
          ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
          ctx.closePath();
          ctx.fillStyle = 'black'; // 临时填充色，用于产生阴影
          ctx.fill();
        } else {
          // 无圆角：绘制矩形
          ctx.fillStyle = 'black'; // 临时填充色，用于产生阴影
          ctx.fillRect(-width / 2, -height / 2, width, height);
        }
        
        // 清除阴影设置
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      
      // === 步骤2: 创建圆角裁剪路径 ===
      if (mediaStyle.borderRadius) {
        const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(-width / 2 + radius, -height / 2);
        ctx.lineTo(width / 2 - radius, -height / 2);
        ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
        ctx.lineTo(width / 2, height / 2 - radius);
        ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
        ctx.lineTo(-width / 2 + radius, height / 2);
        ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
        ctx.lineTo(-width / 2, -height / 2 + radius);
        ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
        ctx.closePath();
        ctx.clip();
      }
      
      // === 步骤3: 应用透明度和滤镜 ===
      ctx.globalAlpha = opacity;
      
      const filters = [];
      if (mediaStyle.blur && mediaStyle.blur > 0) {
        filters.push(`blur(${mediaStyle.blur}px)`);
      }
      if (mediaStyle.brightness && mediaStyle.brightness !== 100) {
        filters.push(`brightness(${mediaStyle.brightness}%)`);
      }
      if (filters.length > 0) {
        ctx.filter = filters.join(' ');
      }
      
      // === 步骤4: 绘制图片内容 ===
      if (clip.cropArea && media.width && media.height) {
        // 处理裁剪：绘制裁剪后的图片
        const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = clip.cropArea;
        
        // 检查图片实际尺寸是否与 media 尺寸一致
        const actualImageWidth = img.naturalWidth || media.width;
        const actualImageHeight = img.naturalHeight || media.height;
        
        console.log('🖼️ 导出-图片裁剪:', {
          媒体尺寸: { width: media.width, height: media.height },
          图片实际尺寸: { width: actualImageWidth, height: actualImageHeight },
          裁剪区域: { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
        });
        
        // 如果尺寸不一致，需要调整裁剪坐标
        const scaleX = actualImageWidth / media.width;
        const scaleY = actualImageHeight / media.height;
        
        const adjustedCropX = cropX * scaleX;
        const adjustedCropY = cropY * scaleY;
        const adjustedCropWidth = cropWidth * scaleX;
        const adjustedCropHeight = cropHeight * scaleY;
        
        ctx.drawImage(
          img, 
          adjustedCropX, adjustedCropY, adjustedCropWidth, adjustedCropHeight,  // 源裁剪区域
          -width / 2, -height / 2, width, height  // 目标区域
        );
      } else {
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
      }
      
      // 清除阴影和滤镜，准备绘制轮廓
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      
      // 4. 绘制轮廓（在外层，不受滤镜影响）
      if (mediaStyle.outlineColor && mediaStyle.outlineWidth) {
        ctx.strokeStyle = mediaStyle.outlineColor;
        ctx.lineWidth = mediaStyle.outlineWidth;
        if (mediaStyle.borderRadius) {
          // 如果有圆角，沿着圆角路径绘制轮廓
          const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(-width / 2 + radius, -height / 2);
          ctx.lineTo(width / 2 - radius, -height / 2);
          ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
          ctx.lineTo(width / 2, height / 2 - radius);
          ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
          ctx.lineTo(-width / 2 + radius, height / 2);
          ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
          ctx.lineTo(-width / 2, -height / 2 + radius);
          ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.strokeRect(-width / 2, -height / 2, width, height);
        }
      }
      
    } else if (media.type === "video") {
      const video = await loadVideo(media.url);
      const width = clip.width ?? (media.width || video.videoWidth);
      const height = clip.height ?? (media.height || video.videoHeight);
      
      // 计算元素左上角坐标和中心点坐标
      const x = clip.x ?? (canvasSize.width - width) / 2;
      const y = clip.y ?? (canvasSize.height - height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // 应用变换（平移到中心点、旋转、缩放）- 对应外层容器的 transform
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      
      const trimStart = clip.trimStart || 0;
      const videoTime = trimStart + (currentTime - clip.start);
      video.currentTime = Math.max(0, Math.min(videoTime, video.duration));
      
      await new Promise<void>(resolve => {
        const checkReady = () => {
          if (video.readyState >= 2) resolve();
          else setTimeout(checkReady, 50);
        };
        checkReady();
      });
      
      const mediaStyle = clip.mediaStyle || {};
      
      // === 步骤1: 绘制阴影 ===
      // 阴影需要通过绘制一个形状来产生，不能只设置属性
      if (mediaStyle.shadowColor && mediaStyle.shadowBlur) {
        ctx.shadowColor = mediaStyle.shadowColor;
        ctx.shadowBlur = mediaStyle.shadowBlur || 0;
        ctx.shadowOffsetX = mediaStyle.shadowOffsetX || 0;
        ctx.shadowOffsetY = mediaStyle.shadowOffsetY || 0;
        
        // 绘制一个形状来产生阴影
        if (mediaStyle.borderRadius) {
          // 有圆角：绘制圆角矩形
          const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(-width / 2 + radius, -height / 2);
          ctx.lineTo(width / 2 - radius, -height / 2);
          ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
          ctx.lineTo(width / 2, height / 2 - radius);
          ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
          ctx.lineTo(-width / 2 + radius, height / 2);
          ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
          ctx.lineTo(-width / 2, -height / 2 + radius);
          ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
          ctx.closePath();
          ctx.fillStyle = 'black'; // 临时填充色，用于产生阴影
          ctx.fill();
        } else {
          // 无圆角：绘制矩形
          ctx.fillStyle = 'black'; // 临时填充色，用于产生阴影
          ctx.fillRect(-width / 2, -height / 2, width, height);
        }
        
        // 清除阴影设置
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      
      // === 步骤2: 创建圆角裁剪路径 ===
      if (mediaStyle.borderRadius) {
        const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(-width / 2 + radius, -height / 2);
        ctx.lineTo(width / 2 - radius, -height / 2);
        ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
        ctx.lineTo(width / 2, height / 2 - radius);
        ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
        ctx.lineTo(-width / 2 + radius, height / 2);
        ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
        ctx.lineTo(-width / 2, -height / 2 + radius);
        ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
        ctx.closePath();
        ctx.clip();
      }
      
      // === 步骤3: 应用透明度和滤镜 ===
      ctx.globalAlpha = opacity;
      
      const filters = [];
      if (mediaStyle.blur && mediaStyle.blur > 0) {
        filters.push(`blur(${mediaStyle.blur}px)`);
      }
      if (mediaStyle.brightness && mediaStyle.brightness !== 100) {
        filters.push(`brightness(${mediaStyle.brightness}%)`);
      }
      if (filters.length > 0) {
        ctx.filter = filters.join(' ');
      }
      
      // === 步骤4: 绘制视频内容 ===
      if (clip.cropArea && media.width && media.height) {
        // 处理裁剪：绘制裁剪后的视频
        const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = clip.cropArea;
        
        // 检查视频实际尺寸是否与 media 尺寸一致
        const actualVideoWidth = video.videoWidth || media.width;
        const actualVideoHeight = video.videoHeight || media.height;
        
        console.log('🎬 导出-视频裁剪:', {
          媒体尺寸: { width: media.width, height: media.height },
          视频实际尺寸: { width: actualVideoWidth, height: actualVideoHeight },
          裁剪区域: { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
        });
        
        // 如果尺寸不一致，需要调整裁剪坐标
        const scaleX = actualVideoWidth / media.width;
        const scaleY = actualVideoHeight / media.height;
        
        const adjustedCropX = cropX * scaleX;
        const adjustedCropY = cropY * scaleY;
        const adjustedCropWidth = cropWidth * scaleX;
        const adjustedCropHeight = cropHeight * scaleY;
        
        ctx.drawImage(
          video, 
          adjustedCropX, adjustedCropY, adjustedCropWidth, adjustedCropHeight,  // 源裁剪区域
          -width / 2, -height / 2, width, height  // 目标区域
        );
      } else {
        ctx.drawImage(video, -width / 2, -height / 2, width, height);
      }
      
      // 清除阴影和滤镜，准备绘制轮廓
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      
      // 4. 绘制轮廓（在外层，不受滤镜影响）
      if (mediaStyle.outlineColor && mediaStyle.outlineWidth) {
        ctx.strokeStyle = mediaStyle.outlineColor;
        ctx.lineWidth = mediaStyle.outlineWidth;
        if (mediaStyle.borderRadius) {
          // 如果有圆角，沿着圆角路径绘制轮廓
          const radius = Math.min(mediaStyle.borderRadius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(-width / 2 + radius, -height / 2);
          ctx.lineTo(width / 2 - radius, -height / 2);
          ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
          ctx.lineTo(width / 2, height / 2 - radius);
          ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
          ctx.lineTo(-width / 2 + radius, height / 2);
          ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
          ctx.lineTo(-width / 2, -height / 2 + radius);
          ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.strokeRect(-width / 2, -height / 2, width, height);
        }
      }
      
    } else if (media.type === "text") {
      const textStyle = clip.textStyle || {};
      let text = clip.text || "Text";
      
      if (textStyle.textTransform === 'uppercase') text = text.toUpperCase();
      else if (textStyle.textTransform === 'lowercase') text = text.toLowerCase();
      else if (textStyle.textTransform === 'capitalize') {
        text = text.replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      
      const width = clip.width ?? 120;
      const height = clip.height ?? 40;
      
      // 计算元素中心点坐标（从左上角坐标转换）
      const x = clip.x ?? (canvasSize.width - width) / 2;
      const y = clip.y ?? (canvasSize.height - height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // 应用变换（平移到中心点、旋转、缩放）
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      
      // 应用透明度
      ctx.globalAlpha = opacity;
      
      // 设置字体样式
      const fontSize = textStyle.fontSize || 24;
      ctx.font = `${textStyle.fontWeight || "normal"} ${fontSize}px ${textStyle.fontFamily || "Arial"}`;
      ctx.fillStyle = textStyle.color || "#ffffff";
      ctx.textBaseline = "top"; // 改为 top 以便更好地控制多行文字
      
      // 根据对齐方式计算文字绘制位置（在容器内对齐）
      const textAlign = textStyle.textAlign || "center";
      let textX = 0;
      
      if (textAlign === "left") {
        ctx.textAlign = "left";
        textX = -width / 2;  // 容器左边界
      } else if (textAlign === "right") {
        ctx.textAlign = "right";
        textX = width / 2;   // 容器右边界
      } else {
        ctx.textAlign = "center";
        textX = 0;           // 容器中心
      }
      
      // 文字阴影
      if (textStyle.shadowColor) {
        ctx.shadowColor = textStyle.shadowColor;
        ctx.shadowOffsetX = textStyle.shadowOffsetX || 0;
        ctx.shadowOffsetY = textStyle.shadowOffsetY || 0;
        ctx.shadowBlur = textStyle.shadowBlur || 0;
      }
      
      // 处理多行文本：按 \n 分割
      const lines = text.split('\n');
      const lineHeight = fontSize * 1.2; // 行高为字号的1.2倍
      const totalTextHeight = lines.length * lineHeight;
      const startY = -totalTextHeight / 2; // 垂直居中

      // 绘制每一行文字
      lines.forEach((line, index) => {
        const currentY = startY + index * lineHeight;
        
        // 文字描边（必须在填充之前绘制，并且描边宽度要加倍）
        if (textStyle.strokeColor && textStyle.strokeWidth) {
          ctx.strokeStyle = textStyle.strokeColor;
          ctx.lineWidth = textStyle.strokeWidth * 2; // Canvas 描边是居中的，所以要乘以2
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(line, textX, currentY);
        }
        
        // 绘制文字填充
        ctx.fillText(line, textX, currentY);
        
        // 文字装饰线（下划线、删除线、上划线）
        if (textStyle.textDecoration && textStyle.textDecoration !== 'none') {
          ctx.save();
          ctx.shadowColor = 'transparent'; // 清除阴影
          ctx.shadowBlur = 0;
          
          const metrics = ctx.measureText(line);
          const textWidth = metrics.width;
          
          // 计算文字起始X坐标（基于 textX 和对齐方式）
          let textStartX = textX;
          if (ctx.textAlign === 'center') {
            textStartX = textX - textWidth / 2;
          } else if (ctx.textAlign === 'right') {
            textStartX = textX - textWidth;
          }
          // left 对齐时 textStartX = textX
          
          ctx.strokeStyle = textStyle.color || '#ffffff';
          ctx.lineWidth = Math.max(1.5, fontSize * 0.06);
          
          const decorations = textStyle.textDecoration.split(' ');
          decorations.forEach((decoration: string) => {
            if (decoration === 'underline') {
              // 下划线：在文字底部下方
              const underlineY = currentY + fontSize * 0.9;
              ctx.beginPath();
              ctx.moveTo(textStartX, underlineY);
              ctx.lineTo(textStartX + textWidth, underlineY);
              ctx.stroke();
            } else if (decoration === 'line-through') {
              // 删除线：在文字中间
              const middleY = currentY + fontSize * 0.5;
              ctx.beginPath();
              ctx.moveTo(textStartX, middleY);
              ctx.lineTo(textStartX + textWidth, middleY);
              ctx.stroke();
            } else if (decoration === 'overline') {
              // 上划线：在文字顶部
              const topY = currentY;
              ctx.beginPath();
              ctx.moveTo(textStartX, topY);
              ctx.lineTo(textStartX + textWidth, topY);
              ctx.stroke();
            }
          });
          ctx.restore();
        }
      });
    }
  } catch (error) {
    console.error("渲染片段失败:", error);
  }
  
  ctx.restore();
};

const renderFrame = async (
  ctx: CanvasRenderingContext2D,
  clips: TimelineClip[],
  mediaItems: MediaItem[],
  currentTime: number,
  canvasSize: { width: number; height: number }
): Promise<void> => {
  // 预览系统使用1920x1080作为基准坐标系统，所有clip坐标都基于此存储
  const baseWidth = 1920;
  const baseHeight = 1080;
  
  // 清空画布背景
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
  
  ctx.save();
  
  // 使用等比例缩放，保持元素不变形（与PreviewCanvas一致）
  // 计算缩放比例：以宽度为基准
  const scale = canvasSize.width / baseWidth;
  ctx.scale(scale, scale);
  
  // 获取可见的素材片段
  const visibleClips = clips
    .filter(clip => currentTime >= clip.start && currentTime < clip.end)
    .sort((a, b) => b.trackIndex - a.trackIndex);
  
  // 使用基准坐标系统渲染（1920x1080）
  for (const clip of visibleClips) {
    const media = mediaItems.find(item => item.id === clip.mediaId);
    if (!media || media.type === 'audio') continue;
    
    await renderSingleClip(ctx, clip, media, currentTime, { width: baseWidth, height: baseHeight });
  }
  
  ctx.restore();
};

export interface ExportOptions {
  resolution?: string;
  frameRate?: number;
  bitrate?: string;
  bitrateMode?: string;
  codec?: string;
  audioSampleRate?: number;
  audioQuality?: string;
  format?: string;
}

export const exportAsMP4 = async (
  clips: TimelineClip[],
  mediaItems: MediaItem[],
  canvasRatio: string,
  onProgress: (progress: number) => void,
  options?: ExportOptions
): Promise<Blob> => {
  // 解析分辨率
  let canvasSize = getCanvasSize(canvasRatio);
  if (options?.resolution) {
    const [width, height] = options.resolution.split('x').map(Number);
    if (width && height) {
      canvasSize = { width, height };
    }
  }
  
  const fps = options?.frameRate ?? 30;
  const audioSampleRate = options?.audioSampleRate ?? 44100;
  
  // 根据分辨率和质量选项确定码率
  let bitrate = "5M";
  const bitrateOption = options?.bitrate ?? "recommended";
  const resolution = options?.resolution ?? "1920x1080";
  
  if (bitrateOption === "lower") {
    if (resolution.includes("7680x4320")) bitrate = "20M"; // 8K
    else if (resolution.includes("3840x2160")) bitrate = "10M"; // 4K
    else if (resolution.includes("2560x1440")) bitrate = "6M"; // 2K
    else if (resolution.includes("1920x1080")) bitrate = "3M"; // 1080P
    else if (resolution.includes("1280x720")) bitrate = "2M"; // 720P
    else bitrate = "1M"; // 480P
  } else if (bitrateOption === "recommended") {
    if (resolution.includes("7680x4320")) bitrate = "50M"; // 8K
    else if (resolution.includes("3840x2160")) bitrate = "20M"; // 4K
    else if (resolution.includes("2560x1440")) bitrate = "10M"; // 2K
    else if (resolution.includes("1920x1080")) bitrate = "5M"; // 1080P
    else if (resolution.includes("1280x720")) bitrate = "3M"; // 720P
    else bitrate = "1.5M"; // 480P
  } else if (bitrateOption === "higher") {
    if (resolution.includes("7680x4320")) bitrate = "100M"; // 8K
    else if (resolution.includes("3840x2160")) bitrate = "40M"; // 4K
    else if (resolution.includes("2560x1440")) bitrate = "20M"; // 2K
    else if (resolution.includes("1920x1080")) bitrate = "10M"; // 1080P
    else if (resolution.includes("1280x720")) bitrate = "5M"; // 720P
    else bitrate = "2M"; // 480P
  } else {
    // 使用自定义码率
    bitrate = bitrateOption;
  }
  
  // 处理编码器
  let codec = options?.codec ?? "libx264";
  let pixelFormat = "yuv420p";
  
  if (codec === "libx265_alpha") {
    codec = "libx265";
    pixelFormat = "yuva420p";
  } else if (codec === "libx265_422") {
    codec = "libx265";
    pixelFormat = "yuv422p";
  }
  
  // 处理音频质量
  const audioQuality = options?.audioQuality ?? "aac_192";
  let audioCodec = "aac";
  let audioBitrate = "192k";
  
  if (audioQuality === "aac_192") {
    audioCodec = "aac";
    audioBitrate = "192k";
  } else if (audioQuality === "aac_256") {
    audioCodec = "aac";
    audioBitrate = "256k";
  } else if (audioQuality === "aac_320") {
    audioCodec = "aac";
    audioBitrate = "320k";
  } else if (audioQuality === "pcm") {
    audioCodec = "pcm_s16le";
    audioBitrate = ""; // PCM 不需要码率参数
  }
  
  const duration = clips.length > 0 ? Math.max(...clips.map(c => c.end)) : 10;
  const outputFormat = options?.format ?? "MP4";
  const outputFile = outputFormat === "MOV" ? "output.mov" : "output.mp4";
  
    // 跟踪当前进度，确保整个导出过程进度只增不减
    let currentProgress = 0;
    const updateProgress = (progress: number) => {
      if (progress > currentProgress) {
        currentProgress = progress;
        onProgress(progress);
      }
    };
    
    // 确保从0%开始
    updateProgress(0);
    console.log("🎬 开始导出，时长:", duration, "秒, 格式:", outputFormat);
    
    try {
    // 加载FFmpeg和初始化
    const ffmpeg = await getFFmpeg();
    
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    
    if (!ctx) throw new Error("无法创建 canvas 上下文");
    
    const totalFrames = Math.ceil(duration * fps);
    console.log(`📹 总帧数: ${totalFrames}, 帧率: ${fps}, 分辨率: ${canvasSize.width}x${canvasSize.height}`);
    
    // 渲染帧: 0% -> 55%
    for (let i = 0; i < totalFrames; i++) {
      const time = i / fps;
      await renderFrame(ctx, clips, mediaItems, time, canvasSize);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('帧导出失败')), 'image/png', 0.9);
      });
      
      await ffmpeg.writeFile(`frame${i.toString().padStart(5, '0')}.png`, await fetchFile(blob));
      // 平滑更新进度: 0% -> 55%
      const frameProgress = Math.floor(((i + 1) / totalFrames) * 55);
      updateProgress(Math.min(frameProgress, 55));
      
      // 每处理一定数量的帧添加小延迟，让进度可见
      if (i % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log("✅ 帧渲染完成");
    updateProgress(55);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 处理音频: 55% -> 60%
    const audioClips = clips.filter(clip => {
      const m = mediaItems.find(item => item.id === clip.mediaId);
      return m && (m.type === 'audio' || m.type === 'video');
    });
    
    let hasAudio = false;
    if (audioClips.length > 0) {
      console.log("🎵 处理音频...");
      const audioMedia = mediaItems.find(item => item.id === audioClips[0].mediaId);
      
      if (audioMedia) {
        try {
          updateProgress(56);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const audioData = await fetchFile(audioMedia.url);
          const ext = audioMedia.type === 'audio' ? 'mp3' : 'mp4';
          await ffmpeg.writeFile(`audio.${ext}`, audioData);
          hasAudio = true;
          console.log(`✅ 音频已加载`);
        } catch (error) {
          console.warn("音频加载失败:", error);
        }
      }
    }
    
    updateProgress(60);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 合成视频: 60% -> 92%
    console.log("🎬 合成视频...");
    
    // FFmpeg progress事件监听
    const progressHandler = ({ progress: prog }: { progress: number }) => {
      // FFmpeg进度从0到1，映射到60%到92%
      const encodingProgress = 60 + Math.floor(prog * 32);
      const newProgress = Math.min(encodingProgress, 92);
      
      // 使用updateProgress确保进度不回退
      updateProgress(newProgress);
    };
    
    ffmpeg.on('progress', progressHandler);
    
    try {
      if (hasAudio) {
        const ext = audioClips[0].mediaId.includes('audio') ? 'mp3' : 'mp4';
        const ffmpegArgs = [
          '-framerate', fps.toString(),
          '-i', 'frame%05d.png',
          '-i', `audio.${ext}`,
          '-map', '0:v', '-map', '1:a',
          '-c:v', codec, '-preset', 'fast', '-b:v', bitrate, '-pix_fmt', pixelFormat,
          '-c:a', audioCodec,
        ];
        
        // 添加音频采样率
        ffmpegArgs.push('-ar', audioSampleRate.toString());
        
        // 如果不是 PCM，添加音频码率
        if (audioBitrate) {
          ffmpegArgs.push('-b:a', audioBitrate);
        }
        
        ffmpegArgs.push('-t', duration.toString(), '-shortest', outputFile);
        
        await ffmpeg.exec(ffmpegArgs);
      } else {
        await ffmpeg.exec([
          '-framerate', fps.toString(),
          '-i', 'frame%05d.png',
          '-c:v', codec, '-preset', 'fast', '-b:v', bitrate, '-pix_fmt', pixelFormat,
          '-t', duration.toString(),
          outputFile
        ]);
      }
    } finally {
      // 移除进度监听器
      ffmpeg.off('progress', progressHandler);
    }
    
    // 等待FFmpeg完成并读取文件: 92% -> 95%
    // 确保进度至少达到92%
    updateProgress(92);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log("✅ 合成完成");
    updateProgress(93);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const data = await ffmpeg.readFile(outputFile) as Uint8Array;
    updateProgress(95);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const arrayBuffer = new ArrayBuffer(data.length);
    new Uint8Array(arrayBuffer).set(data);
    const mimeType = outputFormat === "MOV" ? 'video/quicktime' : 'video/mp4';
    const videoBlob = new Blob([arrayBuffer], { type: mimeType });
    
    console.log("✅ 导出完成:", videoBlob.size, "字节");
    updateProgress(96);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 清理临时文件: 96% -> 99%
    try {
      for (let i = 0; i < totalFrames; i++) {
        await ffmpeg.deleteFile(`frame${i.toString().padStart(5, '0')}.png`);
        // 每删除一定数量的文件更新一次进度
        if (i % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
          const cleanProgress = 96 + Math.floor((i / totalFrames) * 3);
          const newProgress = Math.min(cleanProgress, 99);
          // 使用updateProgress确保进度不回退
          updateProgress(newProgress);
        }
      }
      if (hasAudio) {
        const ext = audioClips[0].mediaId.includes('audio') ? 'mp3' : 'mp4';
        await ffmpeg.deleteFile(`audio.${ext}`);
      }
      await ffmpeg.deleteFile(outputFile);
    } catch (e) {
      console.warn("清理临时文件失败:", e);
    }
    
    // 确保至少达到99%
    updateProgress(99);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 确保到达100%并显示足够时间
    updateProgress(100);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return videoBlob;
    
  } catch (error) {
    console.error("❌ 导出失败:", error);
    throw new Error(`视频导出失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
};
