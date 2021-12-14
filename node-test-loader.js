import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// input object for testing
export function globalPreload() {
  return `globalThis.input = {
    set works (val) {
      if (val)
        console.log('SUCCESS');
    }
  };`;
}

export async function resolve (specifier, context, _defaultResolve) {
  const url = new URL(specifier, context.parentURL);

  // extension adding
  if (!url.pathname.endsWith('.js') && !url.pathname.endsWith('.mjs') && !url.pathname.endsWith('.cjs')) {
    url.pathname += '.js';
  }

  return { url: `${url}` };
}

const cjsModuleRegEx = /module[[.]|require\(/;

// simple es module detection
export async function load (url, _context, _defaultLoad) {
  const source = readFileSync(fileURLToPath(url)).toString();
  if (cjsModuleRegEx.test(source)) {
    return { format: 'commonjs', source };
  }
  else {
    return { format: 'module', source };
  }
}
