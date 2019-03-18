import app from 'apprun'

const searchParams = params => Object.keys(params).map((key) =>
  encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
).join('&')

const cors = url => `https://cors-anywhere.herokuapp.com/${url}`

declare var SPOTIFY_CLIENT_ID: string
declare var SPOTIFY_CLIENT_SECRET: string

app.on('get-playlists', async (state) => {

  state.status = 'Logging in...'
  app.run('render')

  // TODO there is no error handling with any of these requests
  const {access_token} = await fetch(cors(`https://accounts.spotify.com/api/token`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: searchParams({ grant_type: 'client_credentials' })
  }).then(r => r.json())

  state.status = 'Loading playlists...'
  app.run('render')

  const SPOTIFY_USER = `alexrwendland`
  // TODO this will only get the last 50 playlists (would need to call multiple times to get all)
  const playlistsJson = await fetch(cors(`https://api.spotify.com/v1/users/${SPOTIFY_USER}/playlists?limit=50`), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  }).then(r => r.json())

  state.status = `Found ${playlistsJson.items.length} playlists...`
  state.playlists = playlistsJson.items
  app.run('render')

  const pTracksJson = await Promise.all(playlistsJson.items.map(playlist =>
    fetch(cors(playlist.tracks.href), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    }).then(r => r.json())
  ))

  state.allTracks = pTracksJson.reduce((tracks: [], tracksJson: any, i) => {
    const playlist = playlistsJson.items[i]
    return tracks.concat(tracksJson.items.map(({track}) => ({
      name: track.name,
      playlist: playlist.name,
    })))
  }, [])
  state.status = `Found ${state.allTracks.length} total tracks in ${state.playlists.length} playlists`
  app.run('render')

  // Cache web requests so they don't need to be made on each page load
  localStorage.setItem('cached', JSON.stringify({
    allTracks: state.allTracks,
    status: state.status,
  }))
})
