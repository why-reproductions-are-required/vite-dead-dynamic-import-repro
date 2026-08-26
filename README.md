# Vite dead dynamic import reproduction

This repository reproduces an SSR build failure with Vite `8.2.0` and Rolldown `1.2.2`.

Upstream report: [rolldown/rolldown#10779](https://github.com/rolldown/rolldown/issues/10779)

## Reproduce the failure

```sh
pnpm install --frozen-lockfile
pnpm build
```

Vite reports this error:

```text
"./browser" is not exported under the conditions ["module", "node", "production", "import"]
```

## Version boundary

The vinext integration test passes with Vite+ `0.2.7`. That package bundles Vite `8.1.5` and Rolldown `1.2.0`.

The test fails with Vite+ `0.2.8`. That package bundles Vite `8.2.0` and Rolldown `1.2.2`.

| Vite+ | Vite | Rolldown | Result |
| --- | --- | --- | --- |
| `0.2.7` | `8.1.5` | `1.2.0` | Pass |
| `0.2.8` | `8.2.0` | `1.2.2` | Fail |

Direct Rolldown tests locate the behavior change between `1.2.0` and `1.2.1`:

| Rolldown | Result for `src/server.js` |
| --- | --- |
| `1.2.0` | Removes `load()` and the dynamic import |
| `1.2.1` through `1.2.5` | Keeps `load()` and the dynamic import |

Run both versions against the same source:

```sh
pnpm dlx rolldown@1.2.0 src/server.js --platform browser --dir /tmp/rolldown-1.2.0 --transform.define 'typeof window:"undefined"'
pnpm dlx rolldown@1.2.1 src/server.js --platform browser --dir /tmp/rolldown-1.2.1 --transform.define 'typeof window:"undefined"'
```

Rolldown `1.2.0` writes one server chunk without `load`. Rolldown `1.2.1` writes the server chunk and a browser chunk.

## Cause

The source calls an unexported function. Its default parameter can evaluate a dynamic import:

```js
function load(
  value = typeof window !== "undefined" ? import("browser-only-package/browser") : null,
) {
  var window;
  return value;
}

load();
```

Rolldown `1.2.0` removes `load()` because Oxc classifies the call as side-effect-free. The default parameter can run the dynamic import, so removing the call changes program behavior.

[Oxc PR #24791](https://github.com/oxc-project/oxc/pull/24791) fixes that dead-code elimination error. [Rolldown PR #10497](https://github.com/rolldown/rolldown/pull/10497) updates Rolldown to Oxc `0.142.0`, which contains the fix. Rolldown `1.2.1` includes that update and keeps `load()`.

The retained call exposes a separate problem in Rolldown's native `define` transform. The transform does not replace `typeof window` in the default parameter because the function body declares `var window`.

JavaScript gives default parameters a separate environment. The body declaration does not bind the `window` reference in the default parameter. See the [ECMAScript function initialization algorithm](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-functiondeclarationinstantiation).

The native `define` scope problem exists in Rolldown `1.2.0`. That release hides the problem in `src/server.js` because its dead-code elimination removes the function call. The Oxc fix in Rolldown `1.2.1` makes the scope problem visible in the vinext build.

## Expected result

The server build replaces `typeof window` with `"undefined"`. Rolldown then removes the false branch and does not resolve the browser-only import.

## Isolate the native define problem

[`src/define-only.js`](src/define-only.js) exports `load`, so Rolldown cannot remove the function. This file shows the native `define` scope problem without depending on the dead-code elimination change.

Rolldown keeps the dynamic import even with this transform option:

```js
{
  define: {
    "typeof window": '"undefined"',
  },
}
```
