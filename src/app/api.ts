import app from 'apprun'
import * as S from 'superstruct'
import { State, Track } from './state'
import {
  SpotifyPlaylist,
  SpotifyPaginatedResponse,
  SpotifyTrack,
} from '../common/types'

const zip = function* <A, B>(arrA: Array<A>, arrB: Array<B>) {
  for (let i = 0; i < arrA.length && i < arrB.length; ++i) {
    yield [arrA[i], arrB[i]] as const
  }
}

app.on('get-playlists', async (state: State) => {
  try {
    state.status = 'Fetching playlist info...'
    app.run('render')

    const jsonResp = await fetch(
      `/.netlify/functions/get-playlists`
    ).then((r) => r.json())
    const playlistResp = jsonResp.playlists
    S.assert(playlistResp, SpotifyPaginatedResponse(SpotifyPlaylist))
    const concatTracksResp = jsonResp.tracks
    S.assert(concatTracksResp, S.array(SpotifyPaginatedResponse(SpotifyTrack)))

    state.status = 'Parsing track info...'
    app.run('render')

    state.playlists = playlistResp.items
    state.allTracks = Array.from(
      zip(playlistResp.items, concatTracksResp)
    ).reduce(
      (allTracks, [playlist, { items: tracks }]) =>
        allTracks.concat(
          tracks
            .sort((t1, t2) => -1 * t1.added_at.localeCompare(t2.added_at)) // Put the newest tracks on top
            .map(({ track }) => ({
              name: track.name,
              spotifyUrl: track.external_urls?.spotify,
              artists: track.artists.map((a) => a.name),
              playlist: playlist.name,
              _searchStr: [
                track.name,
                playlist.name,
                ...track.artists.map((a) => a.name),
              ]
                .join(' ')
                .toLowerCase(),
            }))
        ),
      [] as Array<Track>
    )

    state.status = `Found ${state.allTracks.length} total tracks in ${state.playlists.length} playlists`
    app.run('render')

    // Cache web requests so they don't need to be made on each page load
    localStorage.setItem(
      'cached',
      JSON.stringify({
        allTracks: state.allTracks,
        status: state.status,
      })
    )
  } catch (e) {
    console.error(e)
    const errorMessage =
      e instanceof Error
        ? e.message.replace(/\.?$/, '.') // ensure it ends with a period
        : 'An error occurred.'
    state.status = `${errorMessage} Try refreshing?`
    app.run('render')
  }
})
