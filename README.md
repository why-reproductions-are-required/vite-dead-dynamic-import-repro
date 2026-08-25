# Vite dead dynamic import reproduction

This repository reproduces an SSR build failure with Vite `8.2.0` and Rolldown `1.2.2`.

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
