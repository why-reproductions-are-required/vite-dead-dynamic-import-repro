# Vite dead dynamic import reproduction

This repository reproduces an SSR build failure with Vite `8.2.0` and Rolldown `1.2.2`.

## Observed upgrade boundary

The vinext integration test passes with Vite+ `0.2.7`. That package bundles Vite `8.1.5` and Rolldown `1.2.0`. The test fails after an upgrade to Vite+ `0.2.8`, which bundles Vite `8.2.0` and Rolldown `1.2.2`.

| Vite+ version | Bundled Vite | Bundled Rolldown | vinext result |
| ------------- | ------------ | ---------------- | ------------- |
| `0.2.7`       | `8.1.5`      | `1.2.0`          | Build passes  |
| `0.2.8`       | `8.2.0`      | `1.2.2`          | Build fails   |

The standalone source in this repository also fails with upstream Vite `8.1.5` and Rolldown `1.1.5`. Direct tests of the same source fail with Rolldown `1.2.0` and `1.2.2`. Rolldown `1.2.2` did not introduce the scope error. The Vite+ `0.2.8` upgrade makes the existing error reachable in the vinext build.

## Reproduce the failure

```sh
pnpm install --frozen-lockfile
pnpm build
```

Vite reports this error:

```text
"./browser" is not exported under the conditions ["module", "node", "production", "import"]
```

## Expected result

The build succeeds and removes the dynamic import.

The Vite configuration replaces `typeof window` with `"undefined"`. The [ECMAScript function initialization algorithm](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-functiondeclarationinstantiation) gives default parameters a separate environment. The function-body declaration `var window` does not bind the `window` reference in the default parameter.

The condition is false after Vite applies the define value:

```js
export function load(
  value = typeof window !== "undefined" ? import("browser-only-package/browser") : null,
) {
  var window;
  return value;
}
```

## Actual result

Rolldown keeps the dynamic import. Vite then resolves the import with Node conditions and rejects the browser-only package export.
