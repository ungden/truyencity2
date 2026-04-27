/**
 * TTS controller — singleton that bridges expo-speech (AVSpeechSynthesizer)
 * with react-native-track-player (RNTP).
 *
 * Why this exists:
 * iOS 17/18 suspends apps that declare `UIBackgroundModes: ["audio"]` but
 * never register a track with `MPNowPlayingInfoCenter`. Pure expo-speech
 * looks to iOS like "short-form audio" and gets killed the moment the
 * device locks or the app backgrounds — regardless of AVAudioSession config.
 *
 * Fix: play a silent MP3 on loop through RNTP alongside TTS. RNTP auto-
 * registers Now Playing Info + remote commands, which signals iOS that
 * this is a legitimate long-form audio app (audiobook-style). TTS runs
 * on top via expo-speech, mixing with the silent track.
 *
 * The controller is a plain singleton (not a hook) so the RNTP playback
 * service — which runs outside the React tree — can reach it.
 */
import * as Speech from "expo-speech";
import TrackPlayer, {
  Event,
  RepeatMode,
  State,
  Capability,
  AppKilledPlaybackBehavior,
  IOSCategory,
  IOSCategoryMode,
  IOSCategoryOptions,
} from "react-native-track-player";
import { Asset } from "expo-asset";
import { stripHtml, splitIntoChunks, sanitizeForTTS, TTS_LANGUAGE } from "@/lib/tts";

const isIOS = process.env.EXPO_OS === "ios";

export type TTSStatus = "idle" | "playing" | "paused";

export interface TTSMetadata {
  title: string;
  artist: string;
  artwork?: string;
}

type Listener = () => void;

const SILENT_TRACK_ID = "truyencity-silent-keepalive";

let playerSetupPromise: Promise<void> | null = null;
let silentTrackUrl: string | null = null;

async function ensurePlayerSetup() {
  if (playerSetupPromise) return playerSetupPromise;
  playerSetupPromise = (async () => {
    try {
      await TrackPlayer.setupPlayer({
        // Let RNTP auto-suspend after 30s of no progress on iOS — we override
        // with keep-alive silent track anyway, and this lets AirPlay work.
        autoHandleInterruptions: true,
      });
    } catch (e: any) {
      // "player_already_initialized" is fine — means we re-entered
      if (!String(e?.message || e).includes("already")) {
        console.warn("[TTS] setupPlayer failed:", e);
      }
    }

    try {
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        // On iOS: match the .playback + .spokenAudio session the native
        // config plugin sets at launch, plus .mixWithOthers so expo-speech
        // can speak over the silent track.
        ...(isIOS
          ? {
              iosCategory: IOSCategory.Playback,
              iosCategoryMode: IOSCategoryMode.SpokenAudio,
              iosCategoryOptions: [IOSCategoryOptions.MixWithOthers],
            }
          : {}),
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
      });
      await TrackPlayer.setRepeatMode(RepeatMode.Track);
    } catch (e) {
      console.warn("[TTS] updateOptions failed:", e);
    }
  })();
  return playerSetupPromise;
}

async function resolveSilentTrackUrl(): Promise<string> {
  if (silentTrackUrl) return silentTrackUrl;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../../assets/silent.mp3");
    const asset = Asset.fromModule(mod);
    if (!asset.downloaded) await asset.downloadAsync();
    silentTrackUrl = asset.localUri || asset.uri;
    return silentTrackUrl!;
  } catch (e) {
    console.warn("[TTS] Failed to resolve silent track:", e);
    throw e;
  }
}

class TTSControllerImpl {
  private status: TTSStatus = "idle";
  private speed = 1.0;
  private chunks: string[] = [];
  private currentIndex = 0;
  private isStopped = false;
  private isPaused = false;
  private isChangingSpeed = false;
  private metadata: TTSMetadata | null = null;
  private onChunkAdvanceHandlers: Set<(i: number, total: number) => void> = new Set();
  private onChapterCompleteHandlers: Set<() => void> = new Set();
  private listeners: Set<Listener> = new Set();
  private remoteListenersAttached = false;

  // Auto-resume bridge: the reader screen sets this on natural chapter end
  // before navigating to chapter N+1, so the freshly-mounted reader on the
  // next chapter can detect "auto-advanced — start playing immediately".
  private pendingAutoResume = false;
  // Grace window keeping the silent TrackPlayer track alive after a natural
  // chapter end. Without this, iOS suspends the app the instant TTS finishes
  // and the new chapter never mounts in background → the user sees a frozen
  // app that needs foregrounding before audio resumes. If no speak() arrives
  // within the window, we fall through to a full stop.
  private autoStopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private static AUTO_STOP_GRACE_MS = 15000;

  // ─── Subscription API (for React hook) ───
  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {}
    });
  }

  getState() {
    return {
      status: this.status,
      speed: this.speed,
      currentChunk: this.currentIndex,
      totalChunks: this.chunks.length,
    };
  }

  onChunkAdvance(cb: (i: number, total: number) => void) {
    this.onChunkAdvanceHandlers.add(cb);
    return () => this.onChunkAdvanceHandlers.delete(cb);
  }

  /** Fires when the entire chapter has finished speaking (last chunk's onDone).
   *  Used by the reader screen to auto-advance to the next chapter. Does NOT
   *  fire when stopped manually, paused, or interrupted by speed-change. */
  onChapterComplete(cb: () => void) {
    this.onChapterCompleteHandlers.add(cb);
    return () => this.onChapterCompleteHandlers.delete(cb);
  }

  // ─── Remote event wiring (attached once on first speak) ───
  private attachRemoteListeners() {
    if (this.remoteListenersAttached) return;
    this.remoteListenersAttached = true;

    TrackPlayer.addEventListener(Event.RemotePlay, () => this.resume());
    TrackPlayer.addEventListener(Event.RemotePause, () => this.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => this.stop());
    TrackPlayer.addEventListener(Event.RemoteNext, () => this.skipNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => this.skipPrev());
    // iOS duck-and-resume when another app interrupts (call, Siri, etc.)
    TrackPlayer.addEventListener(Event.RemoteDuck, async (e: any) => {
      if (e.paused || e.permanent) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  // ─── Public API ───
  async speak(htmlContent: string, metadata: TTSMetadata) {
    // A new speak() always cancels any pending auto-stop from the previous
    // chapter — the silent keep-alive track will be reset by loadSilentTrack
    // below, and we don't want the grace timer to stop us mid-chapter.
    this.cancelAutoStop();
    await ensurePlayerSetup();
    this.attachRemoteListeners();

    const plainText = sanitizeForTTS(stripHtml(htmlContent));
    if (!plainText) return;

    const chunks = splitIntoChunks(plainText);
    if (chunks.length === 0) return;

    // Stop any existing speech before starting fresh
    try { Speech.stop(); } catch {}

    this.chunks = chunks;
    this.currentIndex = 0;
    this.isStopped = false;
    this.isPaused = false;
    this.isChangingSpeed = false;
    this.metadata = metadata;

    await this.loadSilentTrack(metadata);
    try { await TrackPlayer.play(); } catch (e) { console.warn("[TTS] RNTP play failed:", e); }

    this.setStatus("playing");
    this.speakChunk(0);
  }

  private async loadSilentTrack(metadata: TTSMetadata) {
    try {
      const url = await resolveSilentTrackUrl();
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: SILENT_TRACK_ID,
        url,
        title: metadata.title,
        artist: metadata.artist,
        artwork: metadata.artwork,
        // Approximate duration — the silent file is 3s but we loop it,
        // so duration tracking in Now Playing is indicative only.
        duration: 0,
      });
    } catch (e) {
      console.warn("[TTS] loadSilentTrack failed:", e);
    }
  }

  pause() {
    if (this.status === "idle") return;
    this.isPaused = true;
    if (isIOS) {
      try { Speech.pause(); } catch {}
    } else {
      // Android: pseudo-pause via stop (we re-speak current chunk on resume)
      try { Speech.stop(); } catch {}
    }
    TrackPlayer.pause().catch(() => {});
    this.setStatus("paused");
  }

  resume() {
    if (this.status !== "paused") return;
    this.isPaused = false;
    this.isStopped = false;
    if (isIOS) {
      try { Speech.resume(); } catch {}
    } else {
      this.speakChunk(this.currentIndex);
    }
    TrackPlayer.play().catch(() => {});
    this.setStatus("playing");
  }

  async stop() {
    // Manual stop wins over any pending auto-resume from a prior chapter end.
    this.cancelAutoStop();
    this.pendingAutoResume = false;
    this.isStopped = true;
    this.isPaused = false;
    this.chunks = [];
    this.currentIndex = 0;
    try { Speech.stop(); } catch {}
    try {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
    } catch {}
    this.setStatus("idle");
  }

  setSpeed(rate: number) {
    this.speed = rate;
    if (this.status === "playing" && !this.isPaused && !this.isStopped) {
      this.isChangingSpeed = true;
      this.isPaused = true; // prevent onDone from advancing
      try { Speech.stop(); } catch {}
      setTimeout(() => {
        this.isPaused = false;
        this.isChangingSpeed = false;
        this.speakChunk(this.currentIndex);
      }, 100);
    }
    this.emit();
  }

  skipNext() {
    if (this.status === "idle") return;
    const next = this.currentIndex + 1;
    if (next >= this.chunks.length) return;
    this.jumpToChunk(next);
  }

  skipPrev() {
    if (this.status === "idle") return;
    const prev = Math.max(0, this.currentIndex - 1);
    this.jumpToChunk(prev);
  }

  private jumpToChunk(index: number) {
    // Guard against onDone from the outgoing chunk double-advancing.
    this.isChangingSpeed = true;
    this.isPaused = true;
    try { Speech.stop(); } catch {}
    setTimeout(() => {
      this.isPaused = false;
      this.isChangingSpeed = false;
      this.speakChunk(index);
    }, 100);
  }

  // ─── Internals ───
  private speakChunk(index: number) {
    if (index >= this.chunks.length || this.isStopped) {
      const naturalEnd = !this.isStopped && index >= this.chunks.length;
      this.currentIndex = 0;
      this.chunks = [];

      if (naturalEnd) {
        // Keep the silent keep-alive TrackPlayer track running so iOS
        // doesn't suspend the app between chapters. The reader screen will
        // set pendingAutoResume + navigate, and the new chapter's reader
        // will call speak() (which cancels the timer + resets the player)
        // within the grace window. If nothing comes (last chapter, fetch
        // failure), the timer fires and we stop fully.
        this.scheduleAutoStop();
        this.setStatus("idle");
        this.onChapterCompleteHandlers.forEach((h) => {
          try { h(); } catch {}
        });
        return;
      }

      // Hard stop path (manual stop, error, isStopped path).
      try { TrackPlayer.stop().catch(() => {}); } catch {}
      this.setStatus("idle");
      return;
    }
    const text = this.chunks[index];
    if (!text || text.trim().length === 0) {
      this.speakChunk(index + 1);
      return;
    }
    this.currentIndex = index;
    this.isPaused = false;
    this.notifyChunkAdvance();

    Speech.speak(text, {
      language: TTS_LANGUAGE,
      rate: this.speed,
      pitch: 1.0,
      onDone: () => {
        if (!this.isPaused && !this.isStopped && !this.isChangingSpeed) {
          this.speakChunk(index + 1);
        }
      },
      onStopped: () => {
        // Pause/stop/speed-change handlers own status transitions.
      },
      onError: () => {
        if (!this.isStopped) this.speakChunk(index + 1);
      },
    });
    this.emit();
  }

  private setStatus(s: TTSStatus) {
    if (this.status === s) return;
    this.status = s;
    this.emit();
  }

  private notifyChunkAdvance() {
    this.onChunkAdvanceHandlers.forEach((h) => {
      try { h(this.currentIndex, this.chunks.length); } catch {}
    });
    this.emit();
  }

  // ─── Auto-resume bridge ───

  /** Reader screen calls this on natural chapter end (before navigating to
   *  chapter N+1). The freshly-mounted next reader checks consumeAutoResume()
   *  after content loads to decide whether to auto-call speak(). */
  requestAutoResume() {
    this.pendingAutoResume = true;
  }

  /** Returns and atomically clears the auto-resume flag. */
  consumeAutoResume(): boolean {
    const flag = this.pendingAutoResume;
    this.pendingAutoResume = false;
    return flag;
  }

  /** Read-only peek: is an auto-resume pending? Used by the reader cleanup
   *  to skip stop() when we're navigating to chapter N+1 via auto-advance. */
  hasPendingAutoResume(): boolean {
    return this.pendingAutoResume;
  }

  private scheduleAutoStop() {
    this.cancelAutoStop();
    this.autoStopTimeoutId = setTimeout(() => {
      this.autoStopTimeoutId = null;
      // Grace window expired without a follow-up speak() — fully stop now.
      this.pendingAutoResume = false;
      try { TrackPlayer.stop().catch(() => {}); } catch {}
    }, TTSControllerImpl.AUTO_STOP_GRACE_MS);
  }

  private cancelAutoStop() {
    if (this.autoStopTimeoutId) {
      clearTimeout(this.autoStopTimeoutId);
      this.autoStopTimeoutId = null;
    }
  }
}

export const ttsController = new TTSControllerImpl();
