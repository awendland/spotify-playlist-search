// One-time helper to obtain SPOTIFY_REFRESH_TOKEN for the get-playlists function.
//
// 1. Add http://127.0.0.1:8888/callback as a Redirect URI on the Spotify app
//    (developer.spotify.com/dashboard -> your app -> Settings)
// 2. SPOTIFY_CLIENT_ID=... node scripts/get-refresh-token.js
//    (prompts for the client secret if SPOTIFY_CLIENT_SECRET isn't set)
// 3. Open the printed URL and approve. The client id, secret and refresh token
//    are written to .env (gitignored) for `netlify dev` and `netlify env:import`.
const fs = require('fs')
const http = require('http')
const crypto = require('crypto')
const readline = require('readline')

const ENV_FILE = `${__dirname}/../.env`
const PORT = 8888
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`
const SCOPES = 'playlist-read-private playlist-read-collaborative'

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl._writeToOutput = (s) => {
      if (s.startsWith(question)) rl.output.write(s)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer.trim())
    })
  })
}

async function main() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) {
    console.error('Set SPOTIFY_CLIENT_ID in the env')
    process.exit(1)
  }
  const clientSecret =
    process.env.SPOTIFY_CLIENT_SECRET ||
    (await promptHidden('Spotify client secret (hidden): '))

  const state = crypto.randomBytes(16).toString('hex')
  const authorizeUrl =
    'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
      state,
    })

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, REDIRECT_URI)
    if (url.pathname !== '/callback') {
      res.writeHead(404).end()
      return
    }
    try {
      if (url.searchParams.get('state') !== state)
        throw new Error('state mismatch')
      const error = url.searchParams.get('error')
      if (error) throw new Error(error)

      const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: url.searchParams.get('code'),
          redirect_uri: REDIRECT_URI,
        }),
      })
      const json = await tokenResp.json()
      if (!json.refresh_token)
        throw new Error(`no refresh token (${tokenResp.status} ${json.error})`)

      fs.writeFileSync(
        ENV_FILE,
        [
          `SPOTIFY_CLIENT_ID=${clientId}`,
          `SPOTIFY_CLIENT_SECRET=${clientSecret}`,
          `SPOTIFY_REFRESH_TOKEN=${json.refresh_token}`,
          '',
        ].join('\n'),
        { mode: 0o600 }
      )
      console.log(`Wrote SPOTIFY_REFRESH_TOKEN to .env`)
      res.end('Got the refresh token. You can close this tab.')
    } catch (e) {
      console.error(`Failed: ${e.message}`)
      res.end(`Failed: ${e.message}`)
    } finally {
      server.close()
    }
  })

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Open this URL to authorize:\n\n${authorizeUrl}\n`)
  })
}

main()
