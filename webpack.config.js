const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: 'server.js',
  resolve: {
    modules: [
      path.resolve('./'),
      path.resolve('./public'),
      path.resolve('./node_modules')
    ]
  },
  devtool: 'source-map',
  output: {
    path: path.resolve('./'),
    filename: 'index_bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: {
          loader: 'script-loader'
        }
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' }
        ]
      }
    ]
  }
}
