/*
 *   Copyright (c) 2025 Alexey Vinogradov
 *   All rights reserved.

 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 */

const { defineConfig } = require('@vue/cli-service')
const {DefinePlugin} = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = defineConfig({
  // Полностью отключаем ESLint при сборке
  lintOnSave: false,
  transpileDependencies: true,
  devServer: {
    port: 8081,
  },
  chainWebpack: config => {
    config.plugin('add_flag').use(DefinePlugin, [{
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    }]);
    // Оптимизация для Chrome расширения
    config.optimization.splitChunks(false);
    // Отключаем ESLint для файлов с chrome API
    config.module
      .rule('eslint')
      .exclude
      .add(/chrome-mock\.js$/);
  },
  configureWebpack: {
    plugins: [
      new MiniCssExtractPlugin(),
      new CopyWebpackPlugin({
              patterns: [
                {
                  from: 'public/manifest.json',
                  to: 'manifest.json'
                },
                {
                  from: 'public/icons',
                  to: 'icons',
                  noErrorOnMissing: true
                },
                {
                  from: 'public/options.html',
                  to: 'options.html'
                }
              ]
          })
    ]
  }
});
