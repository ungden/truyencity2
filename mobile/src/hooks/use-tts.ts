import { useCallback, useEffect, useState } from "react";
import { ttsController, TTSMetadata, TTSStatus } from "@/lib/tts-controller";

interface UseTTSReturn {
  status: TTSStatus;
  /** Start speaking from HTML content. Metadata is required — it drives the
   *  iOS Now Playing widget (lock screen + Control Center) which is what
   *  keeps the app alive in background. */
  speak: (htmlContent: string, metadata: TTSMetadata) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  speed: number;
  setSpeed: (rate: number) => void;
  currentChunk: number;
  totalChunks: number;
}

export function useTTS(): UseTTSReturn {
  const [state, setState] = useState(() => ttsController.getState());

  useEffect(() => {
    return ttsController.subscribe(() => {
      setState(ttsController.getState());
    });
  }, []);

  const speak = useCallback((htmlContent: string, metadata: TTSMetadata) => {
    ttsController.speak(htmlContent, metadata).catch((e) => {
      console.warn("[useTTS] speak failed:", e);
    });
  }, []);

  const pause = useCallback(() => ttsController.pause(), []);
  const resume = useCallback(() => ttsController.resume(), []);
  const stop = useCallback(() => {
    ttsController.stop().catch(() => {});
  }, []);
  const setSpeed = useCallback((rate: number) => ttsController.setSpeed(rate), []);

  return {
    status: state.status,
    speak,
    pause,
    resume,
    stop,
    speed: state.speed,
    setSpeed,
    currentChunk: state.currentChunk,
    totalChunks: state.totalChunks,
  };
}
