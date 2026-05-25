const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

module.exports = [
  // Main process
  {
    mode,
    entry: './src/main/index.ts',
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: path.resolve(__dirname, 'dist', 'main'),
      filename: 'main.js',
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/main/tray-icon.png', to: 'tray-icon.png' },
        ],
      }),
    ],
    node: {
      __dirname: false,
      __filename: false,
    },
  },
  // Preload script
  {
    mode,
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: path.resolve(__dirname, 'dist', 'main'),
      filename: 'preload.js',
    },
  },
];
