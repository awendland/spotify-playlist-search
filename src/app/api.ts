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

export const normalizeSearchString = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, '')

app.on('get-playlists', async (state: State) => {
  try {
    state.status = 'Fetching playlist info...'
    app.run('render', state)

    const jsonResp = await fetch(`/.netlify/functions/get-playlists`).then(
      (r) => r.json()
    )
    const playlistResp = S.mask(
      jsonResp.playlists,
      SpotifyPaginatedResponse(SpotifyPlaylist)
    )
    const concatTracksResp = S.mask(
      jsonResp.tracks,
      S.array(SpotifyPaginatedResponse(SpotifyTrack))
    )

    state.status = 'Parsing track info...'
    app.run('render', state)

    state.playlists = playlistResp.items
    const allTracks = Array.from(
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
              _searchStr: normalizeSearchString(
                [
                  track.name,
                  playlist.name,
                  ...track.artists.map((a) => a.name),
                ].join(' ')
              ),
            }))
        ),
      [] as Array<Track>
    )
    const countEachSpotifyUrl = allTracks
      .filter((t) => !!t.spotifyUrl)
      .reduce(
        (map, t) => map.set(t.spotifyUrl, (map.get(t.spotifyUrl) ?? 0) + 1),
        new Map()
      )

    state.allTracks = allTracks.map((t) => ({
      ...t,
      isDuplicate: (countEachSpotifyUrl.get(t.spotifyUrl) ?? 0) > 1,
    }))

    state.status = `Found ${state.allTracks.length} total tracks in ${state.playlists.length} playlists`
    app.run('render', state)

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
    app.run('render', state)
  }
})
