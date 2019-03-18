const path = require('path')
const webpack = require('webpack')

// TODO allow these to be provided through env vars
const SPOTIFY_KEYS = require('./spotify_keys.json')

module.exports = {
  entry: {
    'dist/app': './src/main.tsx',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname),
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      { test: /.tsx?$/, loader: 'ts-loader' },
      { test: /\.js$/, use: ["source-map-loader"], enforce: "pre" },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      SPOTIFY_CLIENT_ID: JSON.stringify(SPOTIFY_KEYS.client_id),
      SPOTIFY_CLIENT_SECRET: JSON.stringify(SPOTIFY_KEYS.client_secret),
    }),
  ],
  devServer: {
    open: true,
  },
  devtool: 'source-map',
}
