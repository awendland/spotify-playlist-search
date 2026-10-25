import { randomBytes } from 'crypto'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { SCOPES, redirectUri } from './lib/spotify-auth'

// Starts the Spotify authorization flow so the site owner can (re)connect
// their account from the site instead of the CLI
export const handler = async function (event: APIGatewayProxyEvent) {
  const state = randomBytes(16).toString('hex')
  const authorizeUrl =
    'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID ?? '',
      scope: SCOPES,
      redirect_uri: redirectUri(),
      state,
      // Always show the consent screen so it's clear which account is used
      show_dialog: 'true',
    })
  return {
    statusCode: 302,
    headers: {
      Location: authorizeUrl,
      'Set-Cookie': `spotify_auth_state=${state}; Path=/.netlify/functions/auth-callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      'Cache-Control': 'no-store',
    },
    body: '',
  }
}
