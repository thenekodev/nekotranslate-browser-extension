const path=require('path');
const CopyPlugin=require('copy-webpack-plugin');
module.exports={
  entry:{
    background:'./src/background.js',
    content:'./src/content.js',
    popup:'./src/popup.js',
  },
  output:{
    filename:'[name].js',
    path:path.resolve(__dirname,'dist'),
    clean:true,
  },
  module:{
    rules:[
      {
        test:/\.js$/,
        exclude:/node_modules/,
        use:{
          loader:'babel-loader',
          options:{
            presets:[
              '@babel/preset-env',
            ],
          },
        },
      },
    ],
  },
  plugins:[
    new CopyPlugin({
      patterns:[
        {
          from:`manifest.${process.env.TARGET_BROWSER}.json`,
          to:'manifest.json',
        },
        {
          from: './src/popup.html',
          to: 'popup.html',
        },
        {
          from: './assets/images/*.png',
          to: '[name][ext]',
        },
        {
          from: './assets/fonts/NotoSans-Regular.woff2',
          to: 'NotoSans-Regular.woff2',
        },
        {
          from: './assets/fonts/NotoSansCJKjp-Regular.woff2',
          to: 'NotoSansCJKjp-Regular.woff2',
        },
        {
          from: './assets/fonts/NotoSansCJKsc-Regular.woff2',
          to: 'NotoSansCJKsc-Regular.woff2',
        },
        {
          from: './assets/fonts/NotoSansCJKkr-Regular.woff2',
          to: 'NotoSansCJKkr-Regular.woff2',
        },
      ],
    }),
  ],
  resolve:{
    fallback:{
      'buffer':false,
      'stream':false,
    },
  },
};

