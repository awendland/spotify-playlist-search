import fetch from 'node-fetch'
import { APIGatewayProxyEvent } from 'aws-lambda'
import * as S from 'superstruct'
import {
  SpotifyPaginatedResponse,
  SpotifyPlaylist,
  SpotifyTrack,
} from './common/types'

const searchParams = (params: Record<string, string>) =>
  Object.keys(params)
    .map(
      (key) => encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    )
    .join('&')

let cachedAccessToken: { token: string; expiresAt: number } | null = null

// SPOTIFY_REFRESH_TOKEN is a user-authorized token (see scripts/get-refresh-token.js)
// so that private playlists are visible. Client credentials only see public ones.
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } =
  process.env
;['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'].forEach(
  (secretKey) => {
    if (!process.env[secretKey])
      console.error(
        `!!! Missing ${secretKey} in env: unable to communicate with Spotify API !!!`
      )
  }
)

async function getAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token
  }
  const spotifyAuthBlob = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')
  const resp = await fetch(`https://accounts.spotify.com/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Authorization: `Basic ${spotifyAuthBlob}`,
    },
    body: searchParams({
      grant_type: 'refresh_token',
      refresh_token: SPOTIFY_REFRESH_TOKEN ?? '',
    }),
  })
  if (!resp.ok) {
    throw new Error(
      `Unable to refresh access token: ${resp.status} ${await resp.text()}`
    )
  }
  const { access_token, expires_in } = await resp.json()
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
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (nextIndex < items.length) {
        const i = nextIndex++
        results[i] = await fn(items[i])
      }
    })
  )
  return results
}

export const handler = async function (
  event: APIGatewayProxyEvent,
  context: any
) {
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
      }),
    }
  } catch (err) {
    console.log(err) // output to netlify function log
    return {
      statusCode: 500,
    }
  }
}
