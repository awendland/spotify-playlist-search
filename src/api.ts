import app from 'apprun'

app.on('get-playlists', async (state) => {

  state.status = 'Fetching playlist info...'
  app.run('render')

  const {playlists, tracks} = await fetch(`/.netlify/functions/get-playlists`).then(r => r.json())

  state.status = 'Parsing track info...'
  app.run('render')

  state.playlists = playlists.items
  state.allTracks = tracks.reduce((allTracks: [], tracksJson: any, i) => {
    const playlist = playlists.items[i]
    return allTracks.concat(tracksJson.items.map(({track}) => ({
      name: track.name,
      spotifyUrl: track.external_urls?.spotify,
      artists: track.artists.map(a => a.name),
      playlist: playlist.name,
      _searchStr: `${track.name} ${track.artists.map(a => a.name).join(' ')} ${playlist.name}`.toLowerCase(),
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
