const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const { GenerateSW } = require('workbox-webpack-plugin')

module.exports = {
  entry: {
    app: './src/app/main.tsx',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build/app'),
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      { test: /.tsx?$/, loader: 'ts-loader' },
      { test: /\.js$/, use: ['source-map-loader'], enforce: 'pre' },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'public/index.html',
    }),
    new GenerateSW({
      // these options encourage the ServiceWorkers to get in there fast
      // and not allow any straggling "old" SWs to hang around
      clientsClaim: true,
      skipWaiting: true,
    }),
    new CopyPlugin({ patterns: [{ from: 'public/favicons-for-root' }] }),
  ],
  devServer: {
    static: { directory: path.join(__dirname, 'public') },
  },
  devtool: 'source-map',
}
