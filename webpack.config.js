var path = require('path');
var webpack = require('webpack');
module.exports = {
    entry: './public/main.js',
    output: {
        filename: 'build.js',
        path: path.resolve(__dirname, 'public')
    },
    module: {
        loaders: [{
            test: /.js?$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            query: {
                presets: ['es2015']
            }
        }]
    }
};