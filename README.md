# JS bundler ESM/CJS interop

This repo contains tests for some JS bundler edge cases that I'm trying to get to work in esbuild relating to the `default`/`__esModule` interop mess. In the results below, ✅ indicates the result that I think should happen and 🚫 indicates otherwise. The high-level target behavior is this:

* ESM that has been converted to CJS via Babel sets the `__esModule` flag. When this CJS is imported as ESM, it should behave like the original ESM. In particular, the default export should be equal to `module.exports.default` instead of `module.exports`.

* The above rule is adjusted when the file ends in `.mjs` or `.mts` or `package.json` contains `"type": "module"`. In that case node's behavior should be followed instead since it's likely that this code was intended to run using node's ESM support. In particular, the default export should be equal to `module.exports` instead of `module.exports.default` even if `__esModule` is present.

* The `__esModule` marker should not be observable from ESM code. It should only be observable when ESM code is imported into CJS code.

Each test has a "direct" version and an "indirect" version. The indirect version uses `Math.random()` calls to verify the lack of special-casing regarding how properties are initialized and/or accessed. Certain bundlers do pattern-matching on the AST so for example `exports.x = y` might behave differently than `exports[z] = y` when `z === 'x'` even though those two expressions are equivalent in JavaScript.

All tests have been run through the JS bundlers Webpack, Rollup, Parcel, and esbuild. Tests have additionally been run through node for comparison, although please keep in mind that node is not a JS bundler and shouldn't be expected to implement bundler-specific features such as `require()` of ESM code.

## Results

<table>
<tr><th>Test</th><th>esbuild</th><th>node</th><th>webpack</th><th>parcel</th><th>rollup</th></tr>
<tr><td>Direct:<pre>entry.js:
  import * as entry from './entry.js'
  input.works = entry.__esModule === void 0
</pre>Indirect:<pre>entry.js:
  import * as entry from './entry.js'
  input.works =
    entry[Math.random() < 1 && '__esModule'] === void 0
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>🚫</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import './foo.js'
foo.js:
  import * as foo from './foo.js'
  input.works = foo.__esModule === void 0
</pre>Indirect:<pre>entry.js:
  import './foo.js'
foo.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && '__esModule'] === void 0
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>🚫<br><br>webpack<br>🚫</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = foo.default === '123'
foo.js:
  module.exports = '123'
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'] === '123'
foo.js:
  module[Math.random() < 1 && 'exports'] = '123'
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo.__esModule === void 0 && foo.bar === 123
foo.js:
  export let bar = 123
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && '__esModule'] === void 0 &&
    foo.bar === 123
foo.js:
  export let bar = 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>🚫<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>🚫<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo.__esModule === false && foo.default.bar === 123
foo.js:
  export let __esModule = false
  export default { bar: 123 }
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && '__esModule'] === false &&
    foo[Math.random() < 1 && 'default'].bar === 123
foo.js:
  export let __esModule = false
  export default { bar: 123 }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo.default.default.bar === 123
foo.js:
  exports.__esModule = false
  exports.default = { bar: 123 }
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'].default.bar === 123
foo.js:
  exports[Math.random() < 1 && '__esModule'] = false
  exports[Math.random() < 1 && 'default'] = { bar: 123 }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>🚫<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  const foo = require('./foo.js')
  import * as foo2 from './foo.js'
  input.works = import('./foo.js').then(foo3 =>
    foo.bar === 123 && foo.__esModule === true &&
    foo2.bar === 123 && foo2.__esModule === void 0 &&
    foo3.bar === 123 && foo3.__esModule === void 0)
foo.js:
  export let bar = 123
</pre>Indirect:<pre>entry.js:
  const foo = require('./foo.js')
  import * as foo2 from './foo.js'
  input.works = import('./foo.js').then(foo3 =>
    foo.bar === 123 &&
    foo2.bar === 123 &&
    foo3.bar === 123 &&
    foo[Math.random() < 1 && '__esModule'] === true &&
    foo2[Math.random() < 1 && '__esModule'] === void 0 &&
    foo3[Math.random() < 1 && '__esModule'] === void 0)
foo.js:
  export let bar = 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>🚫<br><br>node<br>🚫</td>
<td>webpack<br>🚫<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  const entry = require('./entry.js')
  input.works = entry.__esModule === void 0
  exports.foo = 123
</pre>Indirect:<pre>entry.js:
  const entry = require('./entry.js')
  input.works =
    entry[Math.random() < 1 && '__esModule'] === void 0
  exports.foo = 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  const entry = require('./entry.js')
  input.works = entry.__esModule === true
  export {}
</pre>Indirect:<pre>entry.js:
  const entry = require('./entry.js')
  input.works =
    entry[Math.random() < 1 && '__esModule'] === true
  export {}
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>🚫<br><br>node<br>🚫</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  const entry = require('./entry.js')
  input.works = entry.__esModule === true
  export default 123
</pre>Indirect:<pre>entry.js:
  const entry = require('./entry.js')
  input.works =
    entry[Math.random() < 1 && '__esModule'] === true
  export default 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>🚫<br><br>node<br>🚫</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  const foo = require('./foo.js')
  input.works = foo.bar === 123 &&
    foo.__esModule === true
foo.js:
  export let bar = 123
</pre>Indirect:<pre>entry.js:
  const foo = require('./foo.js')
  input.works = foo.bar === 123 &&
    foo[Math.random() < 1 && '__esModule'] === true
foo.js:
  export let bar = 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>🚫<br><br>node<br>🚫</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  const foo = require('./foo.js')
  input.works = foo.default === 123 &&
    foo.__esModule === true
foo.js:
  export default 123
</pre>Indirect:<pre>entry.js:
  const foo = require('./foo.js')
  input.works =
    foo[Math.random() < 1 && 'default'] === 123 &&
    foo[Math.random() < 1 && '__esModule'] === true
foo.js:
  export default 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>🚫<br><br>node<br>🚫</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  const foo = require('./foo.js')
  input.works = foo.baz === 123 &&
    foo.__esModule === true
foo.js:
  export * from './bar.js'
bar.js:
  export let baz = 123
</pre>Indirect:<pre>entry.js:
  const foo = require('./foo.js')
  input.works = foo.baz === 123 &&
    foo[Math.random() < 1 && '__esModule'] === true
foo.js:
  export * from './bar.js'
bar.js:
  export let baz = 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>🚫<br><br>node<br>🚫</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import foo from './foo.js'
  input.works = foo.default.bar === 123 &&
    foo.bar === void 0
foo.js:
  module.exports = { default: { bar: 123 } }
</pre>Indirect:<pre>entry.js:
  import foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'].bar === 123 &&
    foo.bar === void 0
foo.js:
  module[Math.random() < 1 && 'exports'] =
    { default: { bar: 123 } }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import foo from './foo.js'
  input.works = foo === 123
foo.js:
  module.exports = 123
</pre>Indirect:<pre>entry.js:
  import foo from './foo.js'
  input.works = foo === 123
foo.js:
  module[Math.random() < 1 && 'exports'] = 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = foo.default.bar === 123
foo.js:
  exports.__esModule = true
  exports.default = { bar: 123 }
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'].bar === 123
foo.js:
  exports[Math.random() < 1 && '__esModule'] = true
  exports[Math.random() < 1 && 'default'] = { bar: 123 }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  input.works = import('./foo.js')
    .then(foo => foo.default === 123 &&
      foo.__esModule === void 0)
foo.js:
  export default 123
</pre>Indirect:<pre>entry.js:
  input.works = import('./foo.js')
    .then(foo =>
      foo[Math.random() < 1 && 'default'] === 123 &&
      foo[Math.random() < 1 && '__esModule'] === void 0)
foo.js:
  export default 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>🚫<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = typeof foo === 'object'
foo.js:
  module.exports = '123'
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = typeof foo === 'object'
foo.js:
  module[Math.random() < 1 && 'exports'] = '123'
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>🚫<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = foo !== '123'
foo.js:
  module.exports = '123'
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = foo !== '123'
foo.js:
  module[Math.random() < 1 && 'exports'] = '123'
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>🚫<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = foo.default === void 0 &&
    foo.bar === 123
foo.js:
  exports.__esModule = true
  exports.bar = 123
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'] === void 0 &&
    foo.bar === 123
foo.js:
  exports.__esModule = true
  exports.bar = 123
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = foo.__esModule === true &&
    foo.default.bar === 123
foo.js:
  export let __esModule = true
  export default { bar: 123 }
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && '__esModule'] === true &&
    foo[Math.random() < 1 && 'default'].bar === 123
foo.js:
  export let __esModule = true
  export default { bar: 123 }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = foo.default.bar === 123
foo.js:
  export let __esModule = true
  export default { bar: 123 }
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'].bar === 123
foo.js:
  export let __esModule = true
  export default { bar: 123 }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as foo from './foo.js'
  input.works = foo.default.bar === 123
foo.js:
  export let __esModule = false
  export default { bar: 123 }
</pre>Indirect:<pre>entry.js:
  import * as foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'].bar === 123
foo.js:
  export let __esModule = false
  export default { bar: 123 }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  const foo = require('./foo.js')
  input.works = foo.__esModule === true
foo.js:
  export let __esModule = 0
</pre>Indirect:<pre>entry.js:
  const foo = require('./foo.js')
  input.works =
    foo[Math.random() < 1 && '__esModule'] === true
foo.js:
  export let __esModule = 0
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>🚫<br><br>node<br>🚫</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import foo from './foo.js'
  input.works = foo === void 0
foo.js:
  module.exports = { bar: 123, __esModule: true }
</pre>Indirect:<pre>entry.js:
  import foo from './foo.js'
  input.works = foo === void 0
foo.js:
  module[Math.random() < 1 && 'exports'] =
    { bar: 123, __esModule: true }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import foo from './foo.cjs'
  input.works = foo.default.bar === 123
foo.cjs:
  module.exports = {
    default: { bar: 123 }, __esModule: true }
package.json:
  { "type": "module" }
</pre>Indirect:<pre>entry.js:
  import foo from './foo.cjs'
  input.works =
    foo[Math.random() < 1 && 'default'].bar === 123
foo.cjs:
  module[Math.random() < 1 && 'exports'] =
    { default: { bar: 123 }, __esModule: true }
package.json:
  { "type": "module" }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.mjs:
  import foo from './foo.js'
  input.works = foo.default.bar === 123
foo.js:
  module.exports = {
    default: { bar: 123 }, __esModule: true }
</pre>Indirect:<pre>entry.mjs:
  import foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'].bar === 123
foo.js:
  module[Math.random() < 1 && 'exports'] =
    { default: { bar: 123 }, __esModule: true }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.mts:
  import foo from './foo.js'
  input.works = foo.default.bar === 123
foo.js:
  module.exports = {
    default: { bar: 123 }, __esModule: true }
</pre>Indirect:<pre>entry.mts:
  import foo from './foo.js'
  input.works =
    foo[Math.random() < 1 && 'default'].bar === 123
foo.js:
  module[Math.random() < 1 && 'exports'] =
    { default: { bar: 123 }, __esModule: true }
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>🚫<br><br>webpack<br>🚫</td>
<td>parcel<br>🚫<br><br>parcel<br>🚫</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as ns from './foo.js'
  let keys = Object.keys(ns)
  input.works = ns.foo === 123 &&
    keys.includes('foo') && !keys.includes('default')
foo.js:
  exports.__esModule = true
  exports.foo = 123
</pre>Indirect:<pre>entry.js:
  import * as ns from './foo.js'
  let keys = Object.keys(ns)
  input.works = ns.foo === 123 &&
    keys.includes('foo') && !keys.includes('default')
foo.js:
  exports[Math.random() < 1 && '__esModule'] = true
  exports[Math.random() < 1 && 'foo'] = 123
</pre></td>
<td>esbuild<br>🚫<br><br>esbuild<br>🚫</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as ns from './foo.js'
  input.works = ns.foo === 123 &&
    {}.hasOwnProperty.call(ns, 'foo') &&
    !{}.hasOwnProperty.call(ns, 'default')
foo.js:
  exports.__esModule = true
  exports.foo = 123
</pre>Indirect:<pre>entry.js:
  import * as ns from './foo.js'
  input.works = ns.foo === 123 &&
    {}.hasOwnProperty.call(ns, 'foo') &&
    !{}.hasOwnProperty.call(ns, 'default')
foo.js:
  exports[Math.random() < 1 && '__esModule'] = true
  exports[Math.random() < 1 && 'foo'] = 123
</pre></td>
<td>esbuild<br>🚫<br><br>esbuild<br>🚫</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as ns from './foo.js'
  let keys = Object.keys(ns)
  input.works =
    ns.default === 123 && !keys.includes('default')
foo.js:
  exports.__esModule = true
  Object.defineProperty(exports,
    'default', { value: 123 })
</pre>Indirect:<pre>entry.js:
  import * as ns from './foo.js'
  let keys = Object.keys(ns)
  input.works =
    ns.default === 123 && !keys.includes('default')
foo.js:
  exports[Math.random() < 1 && '__esModule'] = true
  Object.defineProperty(exports,
    Math.random() < 1 && 'default', { value: 123 })
</pre></td>
<td>esbuild<br>🚫<br><br>esbuild<br>🚫</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>✅</td>
<td>rollup<br>🚫<br><br>rollup<br>🚫</td>
</tr>
<tr><td>Direct:<pre>entry.js:
  import * as ns from './foo.js'
  let keys = Object.keys(ns)
  input.works =
    ns.default === 123 && keys.includes('default')
foo.js:
  exports.__esModule = true
  Object.defineProperty(exports, 'default',
    { value: 123, enumerable: true })
</pre>Indirect:<pre>entry.js:
  import * as ns from './foo.js'
  let keys = Object.keys(ns)
  input.works =
    ns.default === 123 && keys.includes('default')
foo.js:
  exports[Math.random() < 1 && '__esModule'] = true
  Object.defineProperty(exports, Math.random() < 1 && 'default',
    { value: 123, enumerable: true })
</pre></td>
<td>esbuild<br>✅<br><br>esbuild<br>✅</td>
<td>node<br>✅<br><br>node<br>✅</td>
<td>webpack<br>✅<br><br>webpack<br>✅</td>
<td>parcel<br>✅<br><br>parcel<br>🚫</td>
<td>rollup<br>✅<br><br>rollup<br>✅</td>
</tr>
<tr><td>Percent handled:</td>
<td>90.6%</td>
<td>78.1%</td>
<td>71.9%</td>
<td>51.6%</td>
<td>46.9%</td>
</tr>
</table>

## Visual summary

<pre>
esbuild: ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ 🚫🚫 🚫🚫 🚫🚫 ✅✅
node:    ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ 🚫🚫 ✅✅ 🚫🚫 🚫🚫 🚫🚫 🚫🚫 🚫🚫 ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ 🚫🚫 ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅
webpack: ✅🚫 🚫🚫 ✅🚫 🚫🚫 ✅🚫 ✅🚫 🚫🚫 ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ 🚫🚫 🚫🚫 🚫🚫 ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ 🚫🚫 ✅✅ ✅✅ ✅✅ ✅✅
parcel:  ✅✅ ✅✅ 🚫🚫 🚫🚫 🚫🚫 🚫🚫 🚫🚫 ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ 🚫🚫 🚫🚫 🚫🚫 ✅✅ 🚫🚫 🚫🚫 🚫🚫 🚫🚫 ✅✅ 🚫🚫 🚫🚫 🚫🚫 ✅✅ ✅✅ ✅✅ ✅🚫
rollup:  🚫🚫 🚫🚫 ✅✅ 🚫✅ ✅✅ 🚫✅ 🚫🚫 🚫🚫 🚫🚫 🚫🚫 ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ ✅✅ 🚫🚫 ✅✅ ✅✅ 🚫🚫 ✅✅ ✅✅ ✅✅ 🚫🚫 🚫🚫 🚫🚫 🚫🚫 🚫🚫 🚫🚫 🚫🚫 🚫🚫 ✅✅
</pre>
