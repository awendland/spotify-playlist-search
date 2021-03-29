import * as S from 'superstruct'

export const SpotifyPaginatedResponse = <T extends S.Struct<any>>(
  itemType: T
) =>
  S.object({
    href: S.string(),
    items: S.array(itemType),
    limit: S.number(),
    next: S.nullable(S.string()),
    offset: S.number(),
    previous: S.nullable(S.string()),
    total: S.number(),
  })

export const SpotifyPlaylist = S.object({
  external_urls: S.nullable(
    S.object({
      spotify: S.nullable(S.string()),
    })
  ),
  name: S.string(),
  tracks: S.object({
    href: S.string(),
    total: S.number(),
  }),
  // The following properties are unused and therefore disabled to reduce
  // the chance of an error that we don't care about being thrown.
  //
  // collaborative: S.boolean(),
  // description: S.string(),
  // href: S.string(),
  // id: S.string(),
  // images: S.array(S.object({
  //   height: S.number(),
  //   url: S.string(),
  //   width: S.number(),
  // })),
  // owner: S.object({
  //   display_name: S.string(),
  //   external_urls: S.object({
  //     spotify: S.optional(S.string()),
  //   }),
  //   href: S.string(),
  //   id: S.string(),
  //   type: S.string(),
  //   uri: S.string(),
  // }),
  // primary_color: S.nullable(S.string()),
  // public: S.boolean(),
  // snapshot_id: S.string(),
  // type: S.string(),
  // uri: S.string(),
})

export const SpotifyTrack = S.object({
  added_at: S.string(),
  track: S.object({
    artists: S.array(
      S.object({
        external_urls: S.object({ spotify: S.optional(S.string()) }),
        name: S.string(),
        // The following properties are unused and therefore disabled to reduce
        // the chance of an error that we don't care about being thrown.
        //
        // href: S.string(),
        // id: S.string(),
        // type: S.string(),
        // uri: S.string(),
      })
    ),
    external_urls: S.object({ spotify: S.optional(S.string()) }),
    name: S.string(),
    // The following properties are unused and therefore disabled to reduce
    // the chance of an error that we don't care about being thrown.
    //
    // album: S.object(),
    // available_markets: S.array(string()),
    // disc_number: S.number(),
    // duration_ms: S.number(),
    // episode: S.boolean(),
    // explicit: S.boolean(),
    // external_ids: S.object({ isrc: S.nullable(S.string()) }),
    // href: S.string(),
    // id: S.string(),
    // is_local: S.boolean(),
    // popularity: S.number(),
    // preview_url: S.nullable(string()),
    // track: S.boolean(),
    // track_number: S.number(),
    // type: S.string(),
    // uri: S.string(),
  }),
  // The following properties are unused and therefore disabled to reduce
  // the chance of an error that we don't care about being thrown.
  //
  // added_by: S.object(),
  // is_local: S.boolean(),
  // primary_color: S.nullable(S.string()),
  // video_thumbnail: S.object(),
})
