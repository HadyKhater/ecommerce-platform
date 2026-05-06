import { AuthResponse } from '../models/auth.model';

/** Maps Spring OAuth2 / camelCase JWT payloads into `AuthResponse`. */
export function normalizeAuthResponse(raw: unknown): AuthResponse | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const r = raw as Record<string, unknown>;

  const accessToken =
    typeof r['accessToken'] === 'string'
      ? r['accessToken']
      : typeof r['access_token'] === 'string'
        ? r['access_token']
        : null;

  const refreshToken =
    typeof r['refreshToken'] === 'string'
      ? r['refreshToken']
      : typeof r['refresh_token'] === 'string'
        ? r['refresh_token']
        : null;

  if (!accessToken?.trim() || !refreshToken?.trim()) {
    return null;
  }

  const expiresRaw = r['expiresIn'] ?? r['expires_in'];
  const expiresIn =
    typeof expiresRaw === 'number' && Number.isFinite(expiresRaw)
      ? expiresRaw
      : 0;

  const tokenTypeRaw = r['tokenType'] ?? r['token_type'];
  const tokenType =
    typeof tokenTypeRaw === 'string' && tokenTypeRaw.length > 0
      ? tokenTypeRaw
      : 'Bearer';

  return {
    accessToken: accessToken.trim(),
    refreshToken: refreshToken.trim(),
    expiresIn,
    tokenType,
  };
}
