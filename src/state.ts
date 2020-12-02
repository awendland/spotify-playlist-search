import { Infer } from 'superstruct'
import { SpotifyPlaylist, SpotifyTrack } from './types'

export interface Track {
  name: string
  spotifyUrl?: string
  artists?: string[]
  playlist: string
  _searchStr: string
}

export interface State {
  allTracks?: Array<Track>
  playlists?: Array<Infer<typeof SpotifyPlaylist>>
  status?: string
  filter?: string
}
