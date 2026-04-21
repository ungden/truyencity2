import { useState, useCallback, useRef, useEffect } from "react";
import * as Speech from "expo-speech";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import { stripHtml, splitIntoChunks, TTS_LANGUAGE } from "@/lib/tts";

const isIOS = process.env.EXPO_OS === "ios";

/**
 * Activate the audio session.
 *
 * iOS: Do NOT call Audio.setAudioModeAsync — it would overwrite the
 * .spokenAudio mode and .longFormAudio policy that our native config
 * plugin (plugins/with-spoken-audio-session.js) sets at app launch.
 * expo-av's JS API only exposes category+interruption mode, so any call
 * here would silently downgrade the session to the default mode and
 * break AVSpeechSynthesizer's background playback.
 *
 * Android: still configure via JS since we don't have a native plugin
 * there and Speech.speak() doesn't need the spokenAudio niceties to
 * survive backgrounding on Android.
 */
async function activateAudioSession() {
  if (isIOS) return; // native plugin handles iOS — see file header.
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    });
  } catch (e) {
    console.warn("[TTS] Failed to set audio mode:", e);
  }
}

export type TTSStatus = "idle" | "playing" | "paused";

interface UseTTSReturn {
  /** Current playback status */
  status: TTSStatus;
  /** Start speaking from HTML content */
  speak: (htmlContent: string) => void;
  /** Pause playback (pseudo-pause on Android via stop + position tracking) */
  pause: () => void;
  /** Resume from paused position */
  resume: () => void;
  /** Stop and reset */
  stop: () => void;
  /** Current speed rate */
  speed: number;
  /** Set playback speed (will restart current chunk at new rate) */
  setSpeed: (rate: number) => void;
  /** Progress: current chunk index */
  currentChunk: number;
  /** Progress: total chunks */
  totalChunks: number;
}

export function useTTS(): UseTTSReturn {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const [speed, setSpeedState] = useState(1.0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  // Refs for mutable state that callbacks need
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const speedRef = useRef(1.0);
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);
  // For Android pseudo-pause: track how far into current chunk we've spoken
  const pausedChunkOffset = useRef(0);
  // Prevents status reset when changing speed mid-playback
  const isChangingSpeed = useRef(false);

  // Activate audio session on mount + cleanup on unmount
  useEffect(() => {
    activateAudioSession();
    return () => {
      try { Speech.stop(); } catch {}
    };
  }, []);

  const speakChunk = useCallback((chunkIndex: number, textOffset: number = 0) => {
    const chunks = chunksRef.current;
    if (chunkIndex >= chunks.length || isStoppedRef.current) {
      // Done with all chunks
      setStatus("idle");
      setCurrentChunk(0);
      currentChunkRef.current = 0;
      return;
    }

    const text = textOffset > 0
      ? chunks[chunkIndex].slice(textOffset)
      : chunks[chunkIndex];

    if (!text || text.trim().length === 0) {
      // Skip empty chunk, move to next
      speakChunk(chunkIndex + 1, 0);
      return;
    }

    currentChunkRef.current = chunkIndex;
    setCurrentChunk(chunkIndex);
    setStatus("playing");
    isPausedRef.current = false;
    pausedChunkOffset.current = textOffset;

    Speech.speak(text, {
      language: TTS_LANGUAGE,
      rate: speedRef.current,
      pitch: 1.0,
      onDone: () => {
        if (!isPausedRef.current && !isStoppedRef.current && !isChangingSpeed.current) {
          // Move to next chunk
          pausedChunkOffset.current = 0;
          speakChunk(chunkIndex + 1, 0);
        }
      },
      onStopped: () => {
        // Called when Speech.stop() is invoked (including for pause)
        // Don't change status here — pause/stop handlers manage it
      },
      onError: () => {
        if (!isStoppedRef.current) {
          // Try next chunk on error
          pausedChunkOffset.current = 0;
          speakChunk(chunkIndex + 1, 0);
        }
      },
    });
  }, []);

  const speak = useCallback((htmlContent: string) => {
    Speech.stop();

    const plainText = stripHtml(htmlContent);
    if (!plainText) return;

    const chunks = splitIntoChunks(plainText);
    if (chunks.length === 0) return;

    chunksRef.current = chunks;
    isStoppedRef.current = false;
    isPausedRef.current = false;
    pausedChunkOffset.current = 0;
    setTotalChunks(chunks.length);

    speakChunk(0, 0);
  }, [speakChunk]);

  const pause = useCallback(() => {
    if (isIOS) {
      // iOS supports native pause
      Speech.pause();
      setStatus("paused");
      isPausedRef.current = true;
    } else {
      // Android: pseudo-pause via stop
      isPausedRef.current = true;
      Speech.stop();
      setStatus("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (isIOS) {
      Speech.resume();
      setStatus("playing");
      isPausedRef.current = false;
    } else {
      // Android: re-speak from current chunk
      isPausedRef.current = false;
      isStoppedRef.current = false;
      speakChunk(currentChunkRef.current, 0);
    }
  }, [speakChunk]);

  const stop = useCallback(() => {
    isStoppedRef.current = true;
    isPausedRef.current = false;
    pausedChunkOffset.current = 0;
    Speech.stop();
    setStatus("idle");
    setCurrentChunk(0);
    currentChunkRef.current = 0;
  }, []);

  const setSpeed = useCallback((rate: number) => {
    speedRef.current = rate;
    setSpeedState(rate);

    // If currently playing, restart current chunk at new speed
    if (!isPausedRef.current && !isStoppedRef.current && status === "playing") {
      isChangingSpeed.current = true;
      isPausedRef.current = true; // prevent onDone from advancing
      Speech.stop();
      // Small delay to let stop() complete before re-speaking
      setTimeout(() => {
        isPausedRef.current = false;
        isChangingSpeed.current = false;
        speakChunk(currentChunkRef.current, 0);
      }, 100);
    }
  }, [status, speakChunk]);

  return {
    status,
    speak,
    pause,
    resume,
    stop,
    speed,
    setSpeed,
    currentChunk,
    totalChunks,
  };
}
