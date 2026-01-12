const tokens = new Set<string>();

export function addAccessToken(token: string) {
  tokens.add(token);
}

export function hasAccessToken(token: string) {
  return tokens.has(token);
}
