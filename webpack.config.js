const webpack = require('webpack');
process.noDeprecation = true;

module.exports = {
  entry: __dirname + '/source/js/homeserver.js',
  output: {
    path: __dirname + '/frontend',
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /index\.html/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            }
          }
        ]
      },
      {
        test: /red\/theme\/css\/nodeRed\.css/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: './red/theme/css/[name].[ext]',
            }
          }
        ]
      },
      {
        test: /js\/.*\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets:  [['env', {modules: false}]],
            }
          },
        ],
      },
      {
        enforce: 'pre',
        test: /js\/.*\.js$/,
        use: [
          {
            loader: 'eslint-loader',
            options: {
              configFile: './eslintjs'
            },
          },
        ],
      },
      {
        test: /js\/.*\.vue$/,
        use: 'vue-loader',
      },
      {
        enforce: 'pre',
        test: /js\/.*\.vue$/,
        use: [
          {
            loader: 'eslint-loader',
            options: {
              configFile: './eslintvue'
            },
          },
        ],
      },
      {
        test: /view\/.*\.html$/,
        use: 'html-loader',
      },
      {
        test: /css\/.*\.css$/,
        exclude: /nodeRed\.css/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader:  'css-loader',
          }
        ]
      },
      {
        test: /fonts\/.*\.(otf|woff|woff2)(\?.+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: './fonts/[name].[ext]',
            },
          },
        ],
      },
      {
        test: /images\/.*\.(jpg|png)$/,
        use: 'url-loader'
      },
    ]
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.common.js',
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false}
    }),
  ],
};


