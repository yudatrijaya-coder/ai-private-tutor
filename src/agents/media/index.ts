/**
 * Media Agent — barrel exports.
 *
 * @module @/agents/media
 */

export {
  CHARACTER_CONFIGS,
  getCharacter,
  type CharacterConfig,
  type CharacterKey,
} from "./characters";

export {
  generateScript,
  type ScriptInput,
  type ScriptResult,
} from "./script";

export {
  generateNarration,
  estimateSpeechDuration,
  getVoiceName,
} from "./tts";

export {
  renderVideo,
  validateScriptForRender,
  type RenderInput,
} from "./renderer";

export {
  uploadToYouTube,
  searchYouTubeFallback,
  type YouTubeUploadResult,
  type YouTubeSearchResult,
} from "./youtube";

export {
  processMediaRender,
  processMediaYtFallback,
} from "./worker";
