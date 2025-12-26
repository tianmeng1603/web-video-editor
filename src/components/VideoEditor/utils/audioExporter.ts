/**
 * 音频导出模块
 * 
 * 使用FFmpeg.wasm在浏览器中导出音频，支持：
 * - 合成视频中的音频轨道
 * - 合成所有音频片段
 * - 多种音频格式（MP3, WAV, AAC, FLAC, AIFF, OGG）
 * - 自定义比特率和采样率
 * - 实时进度反馈
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { MediaItem, TimelineClip } from "../types";

/** FFmpeg单例实例 */
let ffmpegInstance: FFmpeg | null = null;

/**
 * 获取FFmpeg实例（单例模式）
 */
const getFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();
  ffmpegInstance.on('log', ({ message }) => console.log('[FFmpeg Audio]:', message));

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpegInstance.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });

  console.log('✅ FFmpeg (Audio) 加载完成');
  return ffmpegInstance;
};

/**
 * 音频导出配置
 */
export interface AudioExportOptions {
  /** 音频格式 */
  format: string;
  /** 比特率 (kbps) */
  bitrate: string;
  /** 采样率 (Hz) */
  sampleRate: number;
}

/**
 * 导出音频
 * 
 * @param clips - 时间轴片段列表
 * @param mediaItems - 媒体素材列表
 * @param onProgress - 进度回调函数
 * @param options - 导出配置选项
 * @returns 导出的音频Blob
 */
export const exportAudio = async (
  clips: TimelineClip[],
  mediaItems: MediaItem[],
  onProgress: (progress: number) => void,
  options: AudioExportOptions,
  abortSignal?: AbortSignal
): Promise<Blob> => {
  console.log('🎵 开始导出音频...');
  console.log('导出配置:', options);

  // 检查是否已被中止
  if (abortSignal?.aborted) {
    throw new DOMException('Export was cancelled', 'AbortError');
  }

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
  await new Promise(resolve => setTimeout(resolve, 30));

  // 初始化 FFmpeg
  updateProgress(3);
  await new Promise(resolve => setTimeout(resolve, 20));

  const ffmpeg = await getFFmpeg();

  updateProgress(8);
  await new Promise(resolve => setTimeout(resolve, 20));

  // 计算总时长
  updateProgress(10);
  await new Promise(resolve => setTimeout(resolve, 20));

  const maxClipEnd = clips.length > 0 ? Math.max(...clips.map(c => c.end)) : 0;
  const duration = maxClipEnd;

  if (duration === 0) {
    throw new Error('没有可导出的音频内容');
  }

  console.log(`📊 项目总时长: ${duration.toFixed(2)}秒`);

  updateProgress(12);
  await new Promise(resolve => setTimeout(resolve, 20));

  // 收集所有音频源（视频音频 + 纯音频）
  console.log('🔍 分析音频轨道...');
  updateProgress(14);
  await new Promise(resolve => setTimeout(resolve, 20));

  const audioSources: Array<{
    clip: TimelineClip;
    media: MediaItem;
    url: string;
  }> = [];

  for (const clip of clips) {
    const media = mediaItems.find(m => m.id === clip.mediaId);
    if (!media || !media.url) continue;

    // 视频和音频类型都可能包含音频轨道
    if (media.type === 'video' || media.type === 'audio') {
      audioSources.push({
        clip,
        media,
        url: media.url,
      });
    }
  }

  console.log(`🎼 找到 ${audioSources.length} 个音频源`);

  if (audioSources.length === 0) {
    throw new Error('没有找到任何音频轨道');
  }

  updateProgress(18);
  await new Promise(resolve => setTimeout(resolve, 20));

  updateProgress(20);
  await new Promise(resolve => setTimeout(resolve, 30));

  try {
    // 第一步：加载所有音频文件到FFmpeg (20% -> 35%)
    console.log('📥 开始加载音频文件...');
    for (let i = 0; i < audioSources.length; i++) {
      // 检查是否被中止
      if (abortSignal?.aborted) {
        console.log('🛑 音频导出已在加载文件时被取消');
        throw new DOMException('Export was cancelled', 'AbortError');
      }

      const source = audioSources[i];
      const inputFileName = `input_${i}.mp4`;

      console.log(`📥 加载音频文件 ${i + 1}/${audioSources.length}: ${source.media.name}`);

      const audioData = await fetchFile(source.url);
      await ffmpeg.writeFile(inputFileName, audioData);

      // 加载后更新进度
      const loadProgress = 20 + Math.floor(((i + 1) / audioSources.length) * 15);
      updateProgress(loadProgress);

      // 每个文件加载后都添加延迟
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    updateProgress(35);
    await new Promise(resolve => setTimeout(resolve, 20));

    // 第二步：创建静音基底（项目总时长的静音音频）
    console.log('🔇 创建静音基底...');
    updateProgress(37);
    await new Promise(resolve => setTimeout(resolve, 20));

    await ffmpeg.exec([
      '-f', 'lavfi',
      '-i', `anullsrc=r=${options.sampleRate}:cl=stereo`,
      '-t', duration.toString(),
      '-ar', options.sampleRate.toString(),
      'silence.wav'
    ]);

    updateProgress(42);
    await new Promise(resolve => setTimeout(resolve, 20));

    // 第三步：创建 FFmpeg 滤镜复杂链 (42% -> 48%)
    console.log('🎛️ 构建滤镜链...');
    updateProgress(44);
    await new Promise(resolve => setTimeout(resolve, 20));

    let filterComplex = '';
    const mixInputs: string[] = ['[0:a]']; // 静音基底（注意要加方括号）

    for (let i = 0; i < audioSources.length; i++) {
      const source = audioSources[i];
      const { clip } = source;

      // 计算裁剪参数
      const trimStart = clip.trimStart || 0;
      const trimEnd = clip.trimEnd || (source.media.duration || clip.end - clip.start);

      // 创建音频处理链：裁剪 -> 设置时间戳 -> 延迟
      filterComplex += `[${i + 1}:a]atrim=start=${trimStart}:end=${trimEnd},asetpts=PTS-STARTPTS,adelay=${clip.start * 1000}|${clip.start * 1000}[a${i}];`;
      mixInputs.push(`[a${i}]`);

      // 逐步更新进度
      const filterProgress = 44 + Math.floor(((i + 1) / audioSources.length) * 4);
      updateProgress(filterProgress);
    }

    // 混合所有音频
    filterComplex += `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0[aout]`;

    console.log('🎛️ FFmpeg 滤镜链:', filterComplex);

    updateProgress(48);
    await new Promise(resolve => setTimeout(resolve, 20));

    // 第四步：执行音频混合
    const inputFiles = ['-i', 'silence.wav'];
    for (let i = 0; i < audioSources.length; i++) {
      inputFiles.push('-i', `input_${i}.mp4`);
    }

    // 根据格式设置编码参数
    let codecArgs: string[] = [];
    const formatLower = options.format.toLowerCase();

    switch (formatLower) {
      case 'mp3':
        codecArgs = [
          '-c:a', 'libmp3lame',
          '-b:a', `${options.bitrate}k`,
        ];
        break;
      case 'wav':
        codecArgs = [
          '-c:a', 'pcm_s16le',
        ];
        break;
      case 'aac':
        codecArgs = [
          '-c:a', 'aac',
          '-b:a', `${options.bitrate}k`,
        ];
        break;
      case 'flac':
        codecArgs = [
          '-c:a', 'flac',
        ];
        break;
      case 'aiff':
        codecArgs = [
          '-c:a', 'pcm_s16be',
          '-f', 'aiff',
        ];
        break;
      case 'ogg':
        codecArgs = [
          '-c:a', 'libvorbis',
          '-b:a', `${options.bitrate}k`,
        ];
        break;
      default:
        codecArgs = [
          '-c:a', 'libmp3lame',
          '-b:a', `${options.bitrate}k`,
        ];
    }

    // 检查是否被中止
    if (abortSignal?.aborted) {
      console.log('🛑 音频导出已在FFmpeg执行前被取消');
      throw new DOMException('Export was cancelled', 'AbortError');
    }

    console.log('🎚️ 开始混合音频...');
    updateProgress(50);
    await new Promise(resolve => setTimeout(resolve, 20));

    // FFmpeg progress事件监听 (50% -> 92%)
    const progressHandler = ({ progress: prog }: { progress: number }) => {
      // FFmpeg进度从0到1，映射到50%到92%
      const encodingProgress = 50 + Math.floor(prog * 42);
      updateProgress(Math.min(encodingProgress, 92));
    };

    ffmpeg.on('progress', progressHandler);

    try {
      await ffmpeg.exec([
        ...inputFiles,
        '-filter_complex', filterComplex,
        '-map', '[aout]',
        ...codecArgs,
        '-ar', options.sampleRate.toString(),
        '-t', duration.toString(),
        `output.${formatLower}`
      ]);
    } finally {
      // 移除进度监听器
      ffmpeg.off('progress', progressHandler);
    }

    updateProgress(92);
    await new Promise(resolve => setTimeout(resolve, 20));

    // 第五步：读取输出文件 (92% -> 95%)
    console.log('📤 读取输出文件...');
    updateProgress(94);
    await new Promise(resolve => setTimeout(resolve, 20));

    const data = await ffmpeg.readFile(`output.${formatLower}`) as Uint8Array;

    updateProgress(96);
    await new Promise(resolve => setTimeout(resolve, 20));

    // 清理临时文件 (96% -> 98%)
    console.log('🧹 清理临时文件...');
    try {
      await ffmpeg.deleteFile('silence.wav');
      updateProgress(97);

      for (let i = 0; i < audioSources.length; i++) {
        await ffmpeg.deleteFile(`input_${i}.mp4`);
      }
      updateProgress(98);

      await ffmpeg.deleteFile(`output.${formatLower}`);
    } catch (e) {
      console.warn('清理临时文件失败:', e);
    }

    updateProgress(99);
    await new Promise(resolve => setTimeout(resolve, 30));

    updateProgress(100);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 确定MIME类型
    let mimeType = 'audio/mpeg';
    switch (formatLower) {
      case 'mp3': mimeType = 'audio/mpeg'; break;
      case 'wav': mimeType = 'audio/wav'; break;
      case 'aac': mimeType = 'audio/aac'; break;
      case 'flac': mimeType = 'audio/flac'; break;
      case 'aiff': mimeType = 'audio/aiff'; break;
      case 'ogg': mimeType = 'audio/ogg'; break;
    }

    const blob = new Blob([new Uint8Array(data.buffer as ArrayBuffer)], { type: mimeType });
    console.log('✅ 音频导出完成！文件大小:', (blob.size / 1024 / 1024).toFixed(2), 'MB');

    return blob;
  } catch (error) {
    // 如果是取消操作，直接重新抛出，不包装
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('🛑 音频导出已取消');
      throw error;
    }

    console.error('❌ 音频导出失败:', error);
    throw error;
  }
};

