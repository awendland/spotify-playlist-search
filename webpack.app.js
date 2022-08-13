const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

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
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public/favicons-for-root' },
        { from: 'public/service-worker.js' },
      ]
    }),
    new HtmlWebpackPlugin({
      template: 'public/index.html',
    }),
  ],
  devServer: {
    static: { directory: path.join(__dirname, 'public') },
    allowedHosts: ['.gitpod.io']
  },
  devtool: 'inline-source-map',
}
