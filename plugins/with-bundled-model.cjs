const { copyFileSync, mkdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

/** Keeps the offline model in the APK when Expo regenerates the Android project. */
module.exports = function withBundledModel(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const filename = 'Qwen_Qwen3-0.6B-Q4_K_M.gguf';
      const source = join(mod.modRequest.projectRoot, 'models', filename);
      if (statSync(source).size < 100000000) {
        throw new Error(
          `Bundled model is missing or is a Git LFS pointer: run git lfs pull for ${source}.`,
        );
      }
      const assets = join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets');
      mkdirSync(assets, { recursive: true });
      copyFileSync(source, join(assets, filename));
      return mod;
    },
  ]);
};
