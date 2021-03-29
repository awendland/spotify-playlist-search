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
    new GenerateSW(),
    new CopyPlugin([{ from: 'public/favicons-for-root' }]),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'public'),
  },
  devtool: 'source-map',
}
