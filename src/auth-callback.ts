import fetch from 'node-fetch'
import { connectLambda } from '@netlify/blobs'
import { APIGatewayProxyEvent } from 'aws-lambda'
import {
  SPOTIFY_USER,
  clientAuthHeader,
  redirectUri,
  writeStoredAuth,
} from './lib/spotify-auth'

const page = (statusCode: number, message: string) => ({
  statusCode,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    // Clear the one-time state cookie
    'Set-Cookie': `spotify_auth_state=; Path=/.netlify/functions/auth-callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  },
  body: `<!doctype html><meta name="viewport" content="width=device-width"><p>${message}</p><p><a href="/">Back to playlist search</a></p>`,
})

// Spotify redirects here after the user approves the app. Exchange the code
// for a refresh token and store it for get-playlists.
export const handler = async function (event: APIGatewayProxyEvent) {
  connectLambda(event as any)
  try {
    const params = event.queryStringParameters ?? {}
    const expectedState = /(?:^|;\s*)spotify_auth_state=([0-9a-f]+)/.exec(
      event.headers.cookie ?? event.headers.Cookie ?? ''
    )?.[1]
    if (!expectedState || params.state !== expectedState) {
      return page(400, 'Sign-in expired or was started elsewhere. Try again.')
    }
    if (params.error || !params.code) {
      return page(400, `Spotify sign-in failed: ${params.error ?? 'no code'}`)
    }

    const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: clientAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: redirectUri(),
      }),
    })
    const { access_token, refresh_token } = await tokenResp.json()
    if (!tokenResp.ok || !refresh_token) {
      throw new Error(`Token exchange failed: ${tokenResp.status}`)
    }

    const me = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    }).then((r) => r.json())
    if (me.id !== SPOTIFY_USER) {
      const signedInAs = String(me.id).replace(/[^\w.-]/g, '')
      return page(
        403,
        `Signed in as "${signedInAs}", but this site only accepts ${SPOTIFY_USER}.`
      )
    }

    await writeStoredAuth({
      refreshToken: refresh_token,
      authorizedAt: Date.now(),
    })
    console.log(`Stored new refresh token for ${me.id}`)
    return {
      statusCode: 302,
      headers: {
        Location: '/',
        'Cache-Control': 'no-store',
        'Set-Cookie': `spotify_auth_state=; Path=/.netlify/functions/auth-callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      },
      body: '',
    }
  } catch (err) {
    console.log(err) // output to netlify function log
    return page(500, 'Something went wrong storing the Spotify token.')
  }
}
