import './register-sw'
import app from 'apprun'
import './api'
import * as styles from './styles'
import { State } from './state'

const state = {}

const view = (state: State) => {
  let bodyView
  if (state.allTracks) {
    const hasEveryKeyword = (() => {
      const keywords = state.filter?.split(/\s+/) ?? []
      return (searchStr: string) =>
        keywords.every((keyword) => searchStr.includes(keyword))
    })()
    const filteredTracks =
      state.filter && state.filter != ''
        ? state.allTracks.filter((t) => hasEveryKeyword(t._searchStr))
        : state.allTracks
    bodyView = (
      <ul className={styles.list}>
        {filteredTracks.map((p) => (
          <li className={styles.listItem}>
            {p.spotifyUrl ? <a href={p.spotifyUrl}>{p.name}</a> : p.name} <br />
            <small>
              {p.artists?.[0] && `${p.artists[0]} — `}
              {p.playlist}
            </small>
          </li>
        ))}
      </ul>
    )
  } else if (state.playlists) {
    bodyView = (
      <ul>
        {state.playlists.map((p) => (
          <li>{p.name}</li>
        ))}
      </ul>
    )
  } else bodyView = ''

  return (
    <div>
      <h1>Spotify Playlist Search</h1>
      <p>
        <em>{state.status}</em>
      </p>
      <p>
        <a className={styles.refresh} onclick={() => app.run('refresh')}>
          Refresh
        </a>
      </p>
      <input
        type="search"
        disabled={!state.allTracks}
        oninput={(ev) => app.run('filter', ev.target.value)}
        placeholder="Search tracks"
        className={styles.input}
      />
      {bodyView}
    </div>
  )
}

const update: Record<string, (state: State, ...args: any[]) => State | void> = {
  '#': (state) => {
    const cachedState = JSON.parse(localStorage.getItem('cached') ?? 'null')
    if (cachedState) return { ...cachedState, ...state }
    app.run('get-playlists', state)
  },
  refresh: (state: State) => {
    app.run('get-playlists', state)
  },
  filter: (state: State, filter: string) => {
    return { ...state, filter: filter.toLowerCase() }
  },
  render: (state: State) => state,
}

app.start('my-app', state, view, update)
