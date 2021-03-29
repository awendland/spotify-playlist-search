import fetch from 'node-fetch'
import { APIGatewayProxyEvent } from 'aws-lambda'

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
    // TODO this will only get the last 50 playlists (would need to call multiple times to get all)
    const playlistsJson = await fetch(
      `https://api.spotify.com/v1/users/${SPOTIFY_USER}/playlists?limit=50`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
        },
      }
    ).then((r) => r.json())
    console.log(`Found ${playlistsJson.items.length} playlists`)

    // 3. Retrieve track details for each playlist
    const tracksJson = await Promise.all(
      playlistsJson.items.map((playlist: any) =>
        // TODO there is no error handling with any of these requests
        fetch(playlist.tracks.href, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${cachedAccessToken}`,
          },
        }).then((r) => r.json())
      )
    )
    console.log(`Pulled track data for ${playlistsJson.items.length} playlists`)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playlists: playlistsJson,
        tracks: tracksJson,
      }),
    }
  } catch (err) {
    console.log(err) // output to netlify function log
    return {
      statusCode: 500,
    }
  }
}
