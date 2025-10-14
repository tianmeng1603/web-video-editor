import { MediaItem, TimelineClip } from "../types";

// 获取画布尺寸
export const getCanvasSize = (ratio: string) => {
  switch (ratio) {
    case "16:9":
      return { width: 1920, height: 1080 };
    case "9:16":
      return { width: 1080, height: 1920 };
    case "1:1":
      return { width: 1080, height: 1080 };
    default:
      return { width: 1920, height: 1080 };
  }
};

/**
 * 加载图片
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * 加载视频
 */
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

/**
 * 渲染单个片段到 canvas
 */
const renderClipToCanvas = async (
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
          if (video.readyState >= 2) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });
      
      const mediaStyle = clip.mediaStyle || {};
      
      // === 步骤1: 绘制阴影  ===
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
      
      // === 步骤2: 创建圆角裁剪路径  ===
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

/**
 * 导出当前帧为 PNG 图片
 */
export const exportFrameAsPNG = async (
  clips: TimelineClip[],
  mediaItems: MediaItem[],
  currentTime: number,
  canvasRatio: string,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  const canvasSize = getCanvasSize(canvasRatio);
  
  // 跟踪当前进度，确保进度只增不减
  let currentProgress = 0;
  const updateProgress = (progress: number) => {
    if (progress > currentProgress) {
      currentProgress = progress;
      onProgress(progress);
    }
  };
  
  // 确保从0%开始
  updateProgress(0);
  await new Promise(resolve => setTimeout(resolve, 50)); // 让进度显示
  
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  
  updateProgress(5);
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const ctx = canvas.getContext("2d", { willReadFrequently: false });

  if (!ctx) {
    throw new Error("无法创建 canvas 上下文");
  }

  updateProgress(10);
  await new Promise(resolve => setTimeout(resolve, 50));

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updateProgress(15);
  await new Promise(resolve => setTimeout(resolve, 50));

  const baseWidth = 1920;
  const baseHeight = 1080;

  ctx.save();
  // 使用等比例缩放，保持元素不变形（与PreviewCanvas一致）
  // 计算缩放比例：以宽度为基准
  const scale = canvasSize.width / baseWidth;
  ctx.scale(scale, scale);

  const visibleClips = clips
    .filter(clip => currentTime >= clip.start && currentTime < clip.end)
    .sort((a, b) => (b.trackIndex - a.trackIndex));

  updateProgress(20);
  await new Promise(resolve => setTimeout(resolve, 50));

  // 渲染clips: 20% -> 85%
  const totalClips = visibleClips.length;
  if (totalClips === 0) {
    updateProgress(85);
  }
  
  for (let i = 0; i < visibleClips.length; i++) {
    const clip = visibleClips[i];
    const media = mediaItems.find(item => item.id === clip.mediaId);
    if (!media) continue;

    try {
      await renderClipToCanvas(ctx, clip, media, currentTime, { width: baseWidth, height: baseHeight });
      // 平滑进度：20% -> 85%
      const progress = 20 + Math.floor(((i + 1) / totalClips) * 65);
      updateProgress(Math.min(progress, 85));
      // 添加小延迟让进度可见
      if (i % Math.max(1, Math.floor(totalClips / 5)) === 0) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    } catch (error) {
      console.error("渲染片段失败:", clip, error);
    }
  }

  ctx.restore();
  
  updateProgress(85);
  await new Promise(resolve => setTimeout(resolve, 50));

  return new Promise((resolve, reject) => {
    updateProgress(90);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("PNG 生成失败"));
        return;
      }
      
      updateProgress(95);
      await new Promise(res => setTimeout(res, 100));
      
      // 确保到达100%并显示一段时间
      updateProgress(100);
      await new Promise(res => setTimeout(res, 100));
      
      resolve(blob);
    }, "image/png");
  });
};
