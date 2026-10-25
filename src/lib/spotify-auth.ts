import { getStore } from '@netlify/blobs'

// Only this account may authorize the site, otherwise anyone could swap in
// their own playlists by signing in
export const SPOTIFY_USER = `alexrwendland`
export const SCOPES = 'playlist-read-private playlist-read-collaborative'
// Spotify expires refresh tokens 6 months after the user authorizes, and
// refreshing doesn't extend that, so the user has to re-authorize periodically
export const REFRESH_TOKEN_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env

export const redirectUri = () =>
  `${process.env.URL ?? 'http://localhost:8888'}/.netlify/functions/auth-callback`

export const clientAuthHeader = () =>
  'Basic ' +
  Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString(
    'base64'
  )

export interface StoredAuth {
  refreshToken: string
  // ms since epoch of when the user last approved the app on Spotify
  authorizedAt: number
}

const store = () => getStore('spotify-auth')

export async function readStoredAuth(): Promise<StoredAuth | null> {
  return (await store().get('token', { type: 'json' })) ?? null
}

export async function writeStoredAuth(auth: StoredAuth) {
  await store().setJSON('token', auth)
}

export class ReauthRequiredError extends Error {}
