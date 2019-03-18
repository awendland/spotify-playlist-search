import app from 'apprun'
import './api'
import * as styles from './styles'

const state = {}

const view = state => {
  let bodyView
  if (state.allTracks) {
    const filteredTracks = state.filter && state.filter != ''
      ? state.allTracks.filter(t => t.name.toLowerCase().indexOf(state.filter) != -1)
      : state.allTracks
    bodyView = (
      <ul className={styles.list}>
        {filteredTracks.map(p => (
          <li className={styles.listItem}>
            {p.name}<br/>
            <small>{p.playlist}</small>
          </li>
        ))}
      </ul>
    )
  }
  else if (state.playlists) {
    bodyView = (
      <ul>
        {state.playlists.map(p => <li>{p.name}</li>)}
      </ul>
    )
  }
  else
    bodyView = ''

  return (
    <div>
      <style type="text/css">{styles.GLOBAL}</style>
      <h1>Spotify Playlist Search</h1>
      <p><em>{state.status}</em></p>
      <p><a onclick={() => app.run('refresh')}>Refresh</a></p>
      <input
        disabled={!state.allTracks}
        oninput={(ev) => app.run('filter', ev.target.value)}
        placeholder="Search tracks"
        className={styles.input}
      />
      {bodyView}
    </div>
  )
}

const update = {
  '#': state => {
    const cachedState = JSON.parse(localStorage.getItem('cached'))
    if (cachedState) return {...cachedState, ...state}
    app.run('get-playlists', state)
  },
  'refresh': state => {
    app.run('get-playlists', state)
  },
  'filter': (state, filter) => {
    return {...state, filter: filter.toLowerCase()}
  },
  'render': state => state,
}

app.start('my-app', state, view, update)
