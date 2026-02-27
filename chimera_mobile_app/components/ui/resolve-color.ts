/**
 * Resolves a color token to an actual color string.
 * If the token starts with '#' it's returned as-is (literal color).
 * Otherwise it's looked up in the current theme's color map.
 */
export function resolveColor(
  token: string,
  colors: Record<string, string>,
): string {
  if (token.startsWith('#')) return token;
  if (token === 'transparent') return 'transparent';
  return colors[token] ?? token;
}
