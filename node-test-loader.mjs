import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// input object for testing
export function globalPreload() {
  return `globalThis.input = {
    set works (val) {
      Promise.resolve(val).then(() => {
        if (val)
          console.log('SUCCESS');
      });
    }
  };`;
}

const cjsModuleRegEx = /\b(module|exports)\b/;

// simple es module detection
export async function load(url, _context, _defaultLoad) {
  globalThis.require = createRequire(url);
  const source = readFileSync(fileURLToPath(url)).toString();
  if (cjsModuleRegEx.test(source)) {
    return { format: 'commonjs', source };
  }
  else {
    return { format: 'module', source };
  }
}
