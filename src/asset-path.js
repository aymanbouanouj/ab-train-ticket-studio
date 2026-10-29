// Vite supplies BASE_URL in browser builds; Node unit tests use the root default.
export function assetPath(path) {
  return `${import.meta.env?.BASE_URL || "/"}${path.replace(/^\/+/, "")}`;
}
