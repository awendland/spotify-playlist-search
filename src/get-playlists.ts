import fetch from 'node-fetch'
import { connectLambda } from '@netlify/blobs'
import { APIGatewayProxyEvent } from 'aws-lambda'
import * as S from 'superstruct'
import {
  SpotifyPaginatedResponse,
  SpotifyPlaylist,
  SpotifyTrack,
} from './common/types'
import {
  REFRESH_TOKEN_LIFETIME_MS,
  ReauthRequiredError,
  StoredAuth,
  clientAuthHeader,
  readStoredAuth,
  writeStoredAuth,
} from './lib/spotify-auth'

const searchParams = (params: Record<string, string>) =>
  Object.keys(params)
    .map(
      (key) => encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    )
    .join('&')

let cachedAccessToken: { token: string; expiresAt: number } | null = null

;['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'].forEach((secretKey) => {
  if (!process.env[secretKey])
    console.error(
      `!!! Missing ${secretKey} in env: unable to communicate with Spotify API !!!`
    )
})

// A user-authorized refresh token is needed so that private playlists are
// visible (client credentials only see public ones). It's stored by the
// auth-callback function, falling back to $SPOTIFY_REFRESH_TOKEN (from
// scripts/get-refresh-token.js). authorizedAt is unknown for the fallback.
async function getRefreshToken(): Promise<StoredAuth | null> {
  const stored = await readStoredAuth()
  if (stored) return stored
  const { SPOTIFY_REFRESH_TOKEN } = process.env
  return SPOTIFY_REFRESH_TOKEN
    ? { refreshToken: SPOTIFY_REFRESH_TOKEN, authorizedAt: NaN }
    : null
}

// Share one in-flight refresh between concurrent requests, so a rotated
// refresh token isn't used twice
let pendingAccessToken: Promise<string> | null = null

async function getAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token
  }
  pendingAccessToken ??= refreshAccessToken().finally(() => {
    pendingAccessToken = null
  })
  return pendingAccessToken
}

async function refreshAccessToken() {
  const auth = await getRefreshToken()
  if (!auth) throw new ReauthRequiredError('No refresh token')
  const resp = await fetch(`https://accounts.spotify.com/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Authorization: clientAuthHeader(),
    },
    body: searchParams({
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
    }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    // Spotify returns invalid_grant once the refresh token has expired
    if (resp.status === 400 && body.includes('invalid_grant')) {
      throw new ReauthRequiredError(`Refresh token rejected: ${body}`)
    }
    throw new Error(`Unable to refresh access token: ${resp.status} ${body}`)
  }
  const { access_token, expires_in, refresh_token } = await resp.json()
  // Spotify may rotate the refresh token; keep the newest one (the 6 month
  // lifetime still counts from the original authorization)
  if (refresh_token && refresh_token !== auth.refreshToken) {
    await writeStoredAuth({ ...auth, refreshToken: refresh_token })
  }
  // Refresh a minute early so a token doesn't expire mid-request
  cachedAccessToken = {
    token: access_token,
    expiresAt: Date.now() + (expires_in - 60) * 1000,
  }
  console.log(`Retrieved new access token`)
  return access_token as string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function spotifyGet(url: string, retries = 3): Promise<any> {
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
    },
  })
  // Development-mode apps have a low rate limit, so back off when asked to
  // (as long as the wait fits within the function's execution time limit)
  const retryAfter = Number(resp.headers.get('Retry-After') ?? 1)
  if (resp.status === 429 && retries > 0 && retryAfter <= 3) {
    await sleep(retryAfter * 1000)
    return spotifyGet(url, retries - 1)
  }
  if (!resp.ok) {
    throw new Error(`GET ${url} failed: ${resp.status} ${await resp.text()}`)
  }
  return resp.json()
}

// Follow `next` links until every page of a paginated resource is retrieved
async function accumulatePaginatedResource(firstPageUrl: string) {
  const acc = {
    items: [] as Array<any>,
    offset: 0,
    limit: 0,
    total: 0,
    href: 'SYNTHESIZED',
    next: null,
    previous: null,
  }
  let nextUrl: string | null = firstPageUrl
  while (nextUrl) {
    const page: any = await spotifyGet(nextUrl)
    acc.items = acc.items.concat(page.items)
    acc.total = page.total
    nextUrl = page.next
  }
  acc.limit = acc.items.length
  return acc
}

// Like Promise.all(items.map(fn)), but with at most `concurrency` in flight
async function mapWithConcurrency<T, R>(
  items: Array<T>,
  concurrency: number,
  fn: (item: T) => Promise<R>
) {
  const results: Array<R> = new Array(items.length)
  let nextIndex = 0
  let failed = false
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      // Stop starting new work once anything fails, rather than making
      // requests whose results will be thrown away
      while (!failed && nextIndex < items.length) {
        const i = nextIndex++
        try {
          results[i] = await fn(items[i])
        } catch (err) {
          failed = true
          throw err
        }
      }
    })
  )
  return results
}

const authExpiresAt = (auth: StoredAuth | null) =>
  auth && Number.isFinite(auth.authorizedAt)
    ? new Date(auth.authorizedAt + REFRESH_TOKEN_LIFETIME_MS).toISOString()
    : null

export const handler = async function (
  event: APIGatewayProxyEvent,
  context: any
) {
  connectLambda(event as any)
  try {
    // 1. Retrieve all playlists owned by the authorized user (including
    // private ones). Followed playlists from other users are excluded.
    const { id: userId } = await spotifyGet(`https://api.spotify.com/v1/me`)
    const playlistsJson = await accumulatePaginatedResource(
      `https://api.spotify.com/v1/me/playlists?limit=50`
    )
    playlistsJson.items = playlistsJson.items.filter(
      (playlist) => playlist?.owner?.id === userId
    )
    playlistsJson.total = playlistsJson.limit = playlistsJson.items.length
    const playlists = S.mask(
      // Mask these values to reduce the payload size
      playlistsJson,
      SpotifyPaginatedResponse(SpotifyPlaylist)
    )
    console.log(`Found ${playlists.items.length} playlists`)

    // 2. Retrieve every track for each playlist
    const tracks = await mapWithConcurrency(
      playlists.items,
      10,
      async (playlist) => {
        const trackJson = await accumulatePaginatedResource(
          playlist.tracks.href +
            (playlist.tracks.href.includes('?') ? '&' : '?') +
            'limit=100'
        )
        // Tracks that were removed from Spotify come back as `null`
        trackJson.items = trackJson.items.filter((item) => item?.track)
        return S.mask(trackJson, SpotifyPaginatedResponse(SpotifyTrack))
      }
    )
    console.log(`Pulled track data for ${playlists.items.length} playlists`)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache on Netlify's CDN so repeat page loads don't hit Spotify's rate limit
        'Netlify-CDN-Cache-Control':
          'public, durable, s-maxage=300, stale-while-revalidate=3600',
      },
      body: JSON.stringify({
        playlists,
        tracks,
        // Lets the page prompt the owner to reconnect before the token expires
        auth: {
          expiresAt: authExpiresAt(await getRefreshToken()),
        },
      }),
    }
  } catch (err) {
    console.log(err) // output to netlify function log
    if (err instanceof ReauthRequiredError) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'reauth_required' }),
      }
    }
    return {
      statusCode: 500,
    }
  }
}
