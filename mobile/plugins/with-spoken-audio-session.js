/**
 * Expo config plugin that configures the iOS AVAudioSession for
 * long-form spoken audio (TTS chapter narration) at app launch.
 *
 * Without this, expo-speech's AVSpeechSynthesizer stops the moment the
 * device locks because the default audio session category is `.soloAmbient`,
 * which doesn't survive backgrounding.
 *
 * We set:
 *   - Category:       .playback          (continues when app is backgrounded
 *                                         or screen is locked; required by
 *                                         Apple for apps using the `audio`
 *                                         UIBackgroundModes entitlement)
 *   - Mode:           .spokenAudio       (optimized for speech — pauses when
 *                                         another speech app takes over)
 *   - RouteSharing:   .longFormAudio     (signals this is an audiobook-style
 *                                         app; enables proper AirPlay routing)
 *
 * This is the audio session configuration Apple's documentation recommends
 * for apps in our category:
 *   https://developer.apple.com/documentation/avfaudio/configuring-your-app-for-media-playback
 */

const { withAppDelegate } = require("@expo/config-plugins");

const AUDIO_SESSION_IMPORT = "import AVFAudio";

const AUDIO_SESSION_SETUP = `
    // Configure audio session for background TTS playback (spoken audio).
    // See plugins/with-spoken-audio-session.js for rationale.
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(
        .playback,
        mode: .spokenAudio,
        policy: .longFormAudio,
        options: []
      )
      try session.setActive(true, options: [])
    } catch {
      NSLog("[SpokenAudioSession] Failed to configure audio session: \\(error)")
    }
`;

function addImportIfMissing(contents) {
  if (contents.includes(AUDIO_SESSION_IMPORT)) return contents;
  // Add after the first `import Expo` line.
  return contents.replace(
    /(import Expo\n)/,
    `$1${AUDIO_SESSION_IMPORT}\n`
  );
}

function addSessionSetupIfMissing(contents) {
  if (contents.includes("AVAudioSession.sharedInstance()")) return contents;

  // Expo SDK 54 AppDelegate.swift signature we're targeting:
  //   public override func application(
  //     _ application: UIApplication,
  //     didFinishLaunchingWithOptions launchOptions: ...
  //   ) -> Bool {
  //     ...
  //   }
  //
  // Inject our setup as the first statement inside the body.
  const signatureRe = /(didFinishLaunchingWithOptions[^\{]*\{\n)/;
  if (!signatureRe.test(contents)) {
    throw new Error(
      "[with-spoken-audio-session] Could not find didFinishLaunchingWithOptions in AppDelegate.swift — aborting rather than silently skipping."
    );
  }
  return contents.replace(signatureRe, `$1${AUDIO_SESSION_SETUP}`);
}

module.exports = function withSpokenAudioSession(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error(
        "[with-spoken-audio-session] Expected Swift AppDelegate (Expo SDK 54+)."
      );
    }
    let contents = config.modResults.contents;
    contents = addImportIfMissing(contents);
    contents = addSessionSetupIfMissing(contents);
    config.modResults.contents = contents;
    return config;
  });
};
