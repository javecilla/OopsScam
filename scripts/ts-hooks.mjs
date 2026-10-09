// Lets Node 22.15+/24 run the app's pure TypeScript (src/core, src/ml) without a build step or extra
// dependency: resolves extensionless relative imports to .ts and loads .json files as ES modules.
// Usage: node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts ...
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    if (isRelative && !/\.[cm]?[jt]s$|\.json$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // fall through to the default resolution
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const json = readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${json};`, shortCircuit: true };
    }
    if (url.endsWith('.ts')) {
      return nextLoad(url, { ...context, format: 'module-typescript' });
    }
    return nextLoad(url, context);
  },
});
