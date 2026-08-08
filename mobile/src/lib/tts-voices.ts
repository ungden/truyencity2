/**
 * Vietnamese voice resolution for expo-speech.
 *
 * Why this exists:
 * `Speech.speak({ language: "vi-VN" })` without an explicit `voice` lets the OS
 * pick, and the OS always picks the *compact* voice — the smallest, most robotic
 * vi-VN bundle on the device. Both platforms ship better Vietnamese voices for
 * free; nothing was ever asking for them.
 *
 * Worse, iOS 26 regressed `AVSpeechSynthesisVoice(language:)` so it ignores even
 * the voice the user picked in Settings and returns the system default
 * (Apple Forums 804648 / FB20271264, still open). Passing an explicit identifier
 * is the only way through — so this module always resolves one.
 *
 * Two traps in expo-speech's native code shape the design here:
 *  - iOS maps voice quality with `quality == .enhanced ? "Enhanced" : "Default"`,
 *    collapsing Premium into "Default". So we rank on the identifier string,
 *    never on `quality`.
 *  - Android's `setVoice` silently ignores an identifier that doesn't exist
 *    (iOS throws). So a resolved id must be checked against the live list.
 */
import * as Speech from "expo-speech";

const isIOS = process.env.EXPO_OS === "ios";

export interface VietVoice {
  identifier: string;
  /** Vietnamese display label. */
  label: string;
  /** Higher is better. Used for ranking only. */
  score: number;
  /** Android network voices need connectivity; local ones don't. */
  isNetwork: boolean;
}

// ─── Android: Google Speech Services vi-VN roster ────────────
//
// Five distinct voices, each in a `-local` and a `-network` variant. Two of them
// are male, which iOS has no equivalent for — Apple ships exactly one Vietnamese
// voice (Linh, female) and no premium tier for vi-VN at all.

const ANDROID_VOICE_LABELS: Record<string, string> = {
  "vi-vn-x-vic": "Giọng nữ 1",
  "vi-vn-x-vid": "Giọng nữ 2",
  "vi-vn-x-vie": "Giọng nam 1",
  "vi-vn-x-vif": "Giọng nữ 3",
  "vi-vn-x-gft": "Giọng nam 2",
};

/** True when the voice belongs to a Vietnamese locale, in either separator form. */
function isVietnamese(language: string | undefined): boolean {
  if (!language) return false;
  const normalized = language.toLowerCase().replace("_", "-");
  return normalized === "vi" || normalized.startsWith("vi-");
}

/**
 * Rank a voice by its identifier. Deliberately ignores `quality` — see the
 * module comment for why that field can't be trusted on iOS.
 */
function scoreVoice(identifier: string): number {
  const id = identifier.toLowerCase();

  if (isIOS) {
    // Apple ships no `premium.vi-VN.*`, but rank it anyway so the ordering stays
    // correct if one ever appears.
    if (id.includes(".premium.")) return 30;
    if (id.includes(".enhanced.")) return 20;
    if (id.includes(".super-compact.")) return 5;
    if (id.includes(".compact.")) return 10;
    return 1;
  }

  // Android: network variants are synthesized server-side and sound better than
  // the embedded ones, at the cost of needing connectivity.
  if (id.endsWith("-network")) return 20;
  if (id.endsWith("-local")) return 10;
  return 1;
}

function labelFor(identifier: string, name: string): string {
  if (isIOS) {
    return identifier.toLowerCase().includes(".enhanced.")
      ? "Linh (nâng cao)"
      : "Linh";
  }
  const base = identifier.toLowerCase().replace(/-(network|local)$/, "");
  return ANDROID_VOICE_LABELS[base] ?? name;
}

/**
 * Every Vietnamese voice installed on this device, best first.
 * Empty when the active TTS engine has no Vietnamese voice at all — Samsung's
 * engine, which is the default on many Samsung handsets, exposes none of the
 * `vi-vn-x-*` identifiers. Callers must treat empty as "fall back to
 * `{ language: 'vi-VN' }`", not as an error.
 */
export async function listVietnameseVoices(): Promise<VietVoice[]> {
  let voices: Speech.Voice[];
  try {
    voices = await Speech.getAvailableVoicesAsync();
  } catch (e) {
    console.warn("[TTS] getAvailableVoicesAsync failed:", e);
    return [];
  }

  return voices
    .filter((v) => isVietnamese(v.language) && !!v.identifier)
    .map((v) => ({
      identifier: v.identifier,
      label: labelFor(v.identifier, v.name),
      score: scoreVoice(v.identifier),
      isNetwork: v.identifier.toLowerCase().endsWith("-network"),
    }))
    .sort((a, b) => b.score - a.score);
}

/** The best Vietnamese voice installed, or null if the device has none. */
export async function resolveBestVoice(): Promise<string | null> {
  const voices = await listVietnameseVoices();
  return voices[0]?.identifier ?? null;
}

/**
 * The best Vietnamese voice that works without connectivity.
 * Used as the retry target when a network voice fails mid-chapter.
 */
export async function resolveBestOfflineVoice(): Promise<string | null> {
  const voices = await listVietnameseVoices();
  return voices.find((v) => !v.isNetwork)?.identifier ?? null;
}
