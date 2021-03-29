import fetch, { RequestInit } from 'node-fetch'
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

let cachedAccessToken: string | null = null

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env
;['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'].forEach((secretKey) => {
  if (!process.env[secretKey])
    console.error(
      `!!! Missing ${secretKey} in env: unable to communicate with Spotify API !!!`
    )
})

export const handler = async function (
  event: APIGatewayProxyEvent,
  context: any
) {
  try {
    // 1. Retrieve API token from Spotify (if not already cached)
    if (!cachedAccessToken) {
      const spotifyAuthBlob = Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')
      const { access_token } = await fetch(
        `https://accounts.spotify.com/api/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            Authorization: `Basic ${spotifyAuthBlob}`,
          },
          body: searchParams({ grant_type: 'client_credentials' }),
        }
      ).then((r) => r.json())
      cachedAccessToken = access_token
      console.log(`Retrieved new access token`)
    }

    // 2. Retrieve all playlists for $SPOTIFY_USER
    const SPOTIFY_USER = `alexrwendland`
    async function accumulatePaginatedResource(
      pageableUrl: string,
      requestOptions: RequestInit,
      limit = 50
    ) {
      let acc = {
        items: [],
        offset: 0,
        limit: 0,
        total: Number.POSITIVE_INFINITY,
        href: 'SYNTHESIZED',
        next: null,
        previous: null,
      }
      while (acc.items.length < acc.total) {
        const newPage = await fetch(
          pageableUrl +
            (pageableUrl.includes('?') ? '' : '?') +
            `limit=${limit}&offset=${acc.limit}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${cachedAccessToken}`,
            },
          }
        ).then((r) => r.json())
        acc.items = acc.items.concat(newPage.items)
        acc.total = newPage.total
        acc.limit += newPage.items.length
      }
      return acc
    }
    // TODO this will only get the last 50 playlists (would need to call multiple times to get all)
    const playlistsJson = await accumulatePaginatedResource(
      `https://api.spotify.com/v1/users/${SPOTIFY_USER}/playlists`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
        },
      },
      50
    )
    const playlists = S.mask(
      // Mask these values to reduce the payload size
      playlistsJson,
      SpotifyPaginatedResponse(SpotifyPlaylist)
    )
    console.log(`Found ${playlists.items.length} playlists`)

    // 3. Retrieve track details for each playlist
    const tracks = await Promise.all(
      playlists.items.map((playlist) =>
        // TODO there is no error handling with any of these requests
        fetch(playlist.tracks.href, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${cachedAccessToken}`,
          },
        })
          .then((r) => r.json())
          .then((trackJson) =>
            S.mask(trackJson, SpotifyPaginatedResponse(SpotifyTrack))
          )
      )
    )
    console.log(`Pulled track data for ${playlistsJson.items.length} playlists`)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
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
