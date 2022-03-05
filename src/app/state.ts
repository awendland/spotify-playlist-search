import { Infer } from 'superstruct'
import { SpotifyPlaylist } from '../common/types'

export interface Track {
  name: string
  spotifyUrl?: string
  artists?: string[]
  playlist: string
  _searchStr: string
}

export interface DuplicateTagged {
  isDuplicate: boolean
}

export interface State {
  allTracks?: Array<Track & DuplicateTagged>
  playlists?: Array<Infer<typeof SpotifyPlaylist>>
  status?: string
  filter?: string
}
