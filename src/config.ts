/**
 * ------------------------------------
 * File: d:\My Documents\Documents\GitHub\VUEAutoDeploy\src\config.ts
 * Project: d:\My Documents\Documents\GitHub\VUEAutoDeploy
 * Created Date: 2021-03-02  9:13:26
 * Author: LiuQixuan(liuqixuan@hotmail.com)
 * -----
 * Last Modified:  2021-03-02  11:27:47
 * Modified By: LiuQixuan
 * -----
 * Copyright 2020 - 2021 AIUSoft by LiuQixuan
 * ------------------------------------
 */
interface deveType {
  SERVER_PATH: string,
  SSH_USER: string,
  PASSWORD: string,
  PATH: string // 打包后路径
}
interface prodType {
  SERVER_PATH: string,
  SSH_USER: string,
  PRIVATE_KEY: string,
  PATH: string // 打包后路径
}

export interface configsType{
  development:deveType,
  production:prodType
}

export const configs =  Object.freeze({
  // 开发环境
  development: {
    SERVER_PATH: '112.71.62.21', // ssh url
    SSH_USER: 'root', // ssh user name
    //服务器秘钥
    // PRIVATE_KEY: './.ssh/id_rsa', 
    PASSWORD: '', 
    PATH: '/usr/local/nginx/html/vue'
  },
  // 测试环境
  production: {
    SERVER_PATH: '',
    SSH_USER: 'root',
    PRIVATE_KEY: '',
    PATH: '/test/html'
  }
})