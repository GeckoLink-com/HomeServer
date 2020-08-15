const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

process.noDeprecation = true;

module.exports = {
//  devtool: 'source-map',
  entry: {
    'bundle': [
      './source/js/HomeServer.js',
      './source/red/theme/css/nodeRed.css',
      './source/images/GeckoIcon.png', // for apple-icon
      './source/images/GeckoIcon.ico', // for favicon
    ],
    'SignIn': './source/js/SignIn.js',
  },
  output: {
    path: __dirname + '/frontend',
    filename: 'js/[name].js',
    chunkFilename: 'js/chunk_[name].js',
  },
  module: {
    rules: [
      {
        test: /(sitemap\.xml)|(index\.html)/,
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
        test: /images\/(GeckoIcon\.png)|(GeckoIcon\.ico)/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '/images/[name].[ext]',
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
              presets: [['@babel/preset-env', {modules: false}]],
            },
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
        test: /\.vue$/,
        use: 'vue-loader',
      },
      {
        enforce: 'pre',
        test: /\.vue$/,
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
        test: /\.css$/,
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
        test: /\.(ttf|otf|woff|woff2)(\?.+)?$/,
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
        test: /images\/.*\.(jpg|png|ico|svg)$/,
        exclude: /(GeckoIcon\.png)|(GeckoIcon\.ico)/,
        use: [
          {
            loader: 'url-loader',
            options: {
              esModule: false,
            },
          }
        ],
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
    new TerserPlugin(),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
    new CompressionPlugin({
      filename: '[path].gz[query]',
      algorithm: 'gzip',
      test: /js\/.*\.js$/,
      threshold: 0,
      minRatio: 0.8,
      deleteOriginalAssets: true
    }),
    new VueLoaderPlugin(),
  ],
};


