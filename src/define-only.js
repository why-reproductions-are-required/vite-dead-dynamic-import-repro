export function load(
  value = typeof window !== "undefined" ? import("browser-only-package/browser") : null,
) {
  var window;
  return value;
}
