## Spotify Playlist Search

* **Contxt**: I make quarterly playlists on Spotify, and I don't like to repeat music from previous playlists
* **Problem**: Spotify makes it hard to search your playlists (you have to search each one)
* **Solution**: This small web-app retrieves all your playlists and let's you search the track names

Caveat: at the moment this is hardcoded for my Spotify account, `awendland`.

### Dev

NOTE: you must provide `client_id` and `client_secret` in a JSON file called `spotify_keys.json` in the repo root.

* Use _npm start_ to start the dev server
* Use _npm test_ to run unit tests
* Use _npm run build_ to build for production

This is an application built with [AppRun](https://github.com/yysun/apprun).

### Quick Thoughts

This was shockingly easy to build. AppRun has a great approach that makes it super quick to hit the ground running. I'll probably using it for quickshot projects in the future :)

### Screenshot

![Screenshot of the web app with the search text "Sat" showing 3 matching playlists of 1504 total tracks in 41 playlists](readme/screenshot.jpg)
