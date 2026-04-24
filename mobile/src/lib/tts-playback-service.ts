/**
 * RNTP playback service stub — registered at module-load time because RNTP
 * requires a registered service function for the iOS lock-screen Now Playing
 * widget / Android media notification to appear at all.
 *
 * All remote-control event handling lives in `tts-controller.ts` and is
 * attached lazily on first `speak()`. Duplicating the listeners here would
 * cause each remote tap (play/pause/skip) to fire twice while the app is
 * running.
 *
 * The empty function is intentional — the mere fact that a service is
 * registered is what makes RNTP set up the native media session.
 */
module.exports = async function playbackService() {
  // Intentionally empty — see header.
};
