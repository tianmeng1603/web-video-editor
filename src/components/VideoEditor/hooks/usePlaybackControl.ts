import { useEffect } from "react";

interface UsePlaybackControlProps {
  isPlaying: boolean;
  currentTime: number;
  actualDuration: number;
  scale: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 播放控制 Hook
 * 管理播放、暂停、时间更新等功能
 */
export const usePlaybackControl = ({
  isPlaying,
  currentTime,
  actualDuration,
  scale,
  setCurrentTime,
  setIsPlaying,
}: UsePlaybackControlProps) => {
  const handlePlayPause = () => {
    const playheadWidthTime = 2 / (scale * 50);
    const maxPlayheadTime = actualDuration - playheadWidthTime;

    if (currentTime >= maxPlayheadTime - 0.1 && !isPlaying) {
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeChange = (time: number) => {
    setCurrentTime(time);
  };

  const handleCursorDragStart = (time: number) => {
    console.log("开始拖动播放头:", time);
  };

  const handleCursorDragEnd = (time: number) => {
    console.log("结束拖动播放头:", time);
  };

  // 自动播放更新
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          const nextTime = prev + 0.033;
          const playheadWidthTime = 2 / (scale * 50);
          const maxTime = actualDuration - playheadWidthTime;
          if (nextTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return nextTime;
        });
      }, 33);
      return () => clearInterval(interval);
    }
  }, [isPlaying, actualDuration, scale, setCurrentTime, setIsPlaying]);

  return {
    handlePlayPause,
    handleTimeChange,
    handleCursorDragStart,
    handleCursorDragEnd,
  };
};

