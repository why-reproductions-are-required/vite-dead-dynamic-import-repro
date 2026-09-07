# Vite dead dynamic import fix verification

This branch verifies the fix for [rolldown/rolldown#10779](https://github.com/rolldown/rolldown/issues/10779).

It uses the [Vite+ preview build from PR #2617](https://github.com/voidzero-dev/vite-plus/pull/2617#issuecomment-5560311220). The preview contains Vite `8.2.2`, Rolldown `1.2.7`, and Oxc `0.148.0`.

## Verify the fix

```sh
pnpm install --frozen-lockfile
pnpm build
```

The build must succeed. It must write only `dist/server.js`. The output must not contain the browser-only dynamic import.

The server output is:

```js
var value = "server";
export { value };
```

## Version comparison

| Vite+ | Vite | Rolldown | Result |
| --- | --- | --- | --- |
| `0.2.7` | `8.1.5` | `1.2.0` | Pass because dead-code elimination hides the scope error |
| `0.2.8` | `8.2.0` | `1.2.2` | Fail |
| `0.3.0` | `8.2.2` | `1.2.5` | Fail |
| Preview `15cc57f` | `8.2.2` | `1.2.7` | Pass with the scope fix |

The preview and Vite+ `0.3.0` use the same Vite version. The Rolldown update changes the result.

## Cause and fix

The source uses a global `window` reference in a default parameter. The function body has a separate `var window` binding:

```js
function load(
  value = typeof window !== "undefined" ? import("browser-only-package/browser") : null,
) {
  var window;
  return value;
}

load();
```

JavaScript evaluates the default parameter outside the function body environment. The body declaration does not bind the `window` reference in the parameter. See the [ECMAScript function initialization algorithm](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-functiondeclarationinstantiation).

Older Rolldown versions treat the body declaration as visible in the default parameter. The `define` transform does not replace `typeof window`. Rolldown then resolves the browser-only import during the server build.

[Oxc PR #26099](https://github.com/oxc-project/oxc/pull/26099) corrects reference resolution for default parameters. [Rolldown PR #10809](https://github.com/rolldown/rolldown/pull/10809) updates Oxc to `0.148.0` and includes the fix.

Rolldown `1.2.7` replaces the default value with `null`. It does not resolve the dead browser-only import.

## Isolated Rolldown case

[`src/define-only.js`](src/define-only.js) exports `load`. This prevents dead-code elimination from removing the function before the `define` transform runs.
