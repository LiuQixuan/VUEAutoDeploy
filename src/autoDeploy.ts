/**
 * ------------------------------------
 * File: d:\My Documents\Documents\GitHub\VUEAutoDeploy\src\autoDeploy.ts
 * Project: d:\My Documents\Documents\GitHub\VUEAutoDeploy\src
 * Created Date: 2021-03-02  9:01:44
 * Author: LiuQixuan(liuqixuan@hotmail.com)
 * -----
 * Last Modified:  2021-03-02  11:29:21
 * Modified By: LiuQixuan
 * -----
 * Copyright 2020 - 2021 AIUSoft by LiuQixuan
 * ------------------------------------
 */

import chalk from 'chalk' //命令行颜色
import ora from 'ora' // 加载流程动画
import shell from 'shelljs' // 执行shell命令
import { NodeSSH } from 'node-ssh' // ssh连接服务器
import inquirer from 'inquirer' //命令行交互
import zipFile from 'compressing'// 压缩zip
import fs from 'fs' // nodejs内置文件模块
import path from 'path'// nodejs内置路径模块

import { style } from './progress-style' //加载动画样式
import  {configs, configsType} from './config' // 配置
interface config{
  SERVER_PATH:string,
  SSH_USER:string,
  PATH:string,
  PRIVATE_KEY?:string,
  PASSWORD?:string
}

const SSH = new NodeSSH();
let config: config; // 先使用 inquirer 进行交互后然后存储版本配置(正式版|测试版)

//logs
const defaultLog: (log: string) => string = (log: string) => chalk.blue(`---------------- ${log} ----------------`);
const errorLog: (log: string) => string = (log: string) => chalk.red(`---------------- ${log} ----------------`);
const successLog: (log: string) => string = (log: string) => chalk.green(`---------------- ${log} ----------------`);

//文件夹目录
const distDir = path.resolve(__dirname, '../dist'); //待打包
const distZipPath = path.resolve(__dirname, `../dist.zip`);


//项目打包代码 npm run build 
const compileDist = async () => {
  const loading = ora(defaultLog('项目开始打包')).start();
  loading.spinner = style.arrow4;
  shell.cd(path.resolve(__dirname, '../'));
  const res = await shell.exec('npm run build'); //执行shell 打包命令
  loading.stop();
  if (res.code === 0) {
    successLog('项目打包成功!');
  } else {
    errorLog('项目打包失败, 请重试!');
    process.exit(); //退出流程
  }
}

// 打包zip
const zipDist: () => void = async () => {
  defaultLog('项目开始压缩');
  try {
    await zipFile.zip.compressDir(distDir, distZipPath)
    successLog('压缩成功!');
  } catch (error) {
    errorLog(error);
    errorLog('压缩失败, 退出程序!');
    process.exit(); //退出流程
  }
}

// connect server
const connectSSH = async () => {
  const loading = ora(defaultLog('正在连接服务器')).start();
  loading.spinner = style.arrow4;
  try {
    await SSH.connect({
      host: config.SERVER_PATH,
      username: config.SSH_USER,
      // privateKey: config.PRIVATE_KEY, ////服务器秘钥 备选
      password: config.PASSWORD
    });
    successLog('SSH连接成功!');
  } catch (error) {
    errorLog(error);
    errorLog('SSH连接失败!');
    process.exit(); 
  }
  loading.stop();
}

// 执行远程命令
const runCommand = async (command: string) => {
  const result = await SSH.exec(command, [], { cwd: config.PATH })
  // defaultLog(result);
}

// 清理目录中的历史文件
const clearOldFile = async () => {
  const commands = ['ls', 'rm -rf *'];
  await Promise.all(commands.map(async (it) => {
    return await runCommand(it);
  }));
}

//传送zip文件到服务器
const uploadZipBySSH = async () => {
  //建立ssh连接
  await connectSSH();
  //清空历史文件
  await clearOldFile();
  const loading = ora(defaultLog('准备上传文件')).start();
  loading.spinner = style.arrow4;
  try {
    await SSH.putFiles([{ local: distZipPath, remote: config.PATH + '/dist.zip' }]);
    successLog('上传成功!');
    loading.text = '正在解压文件';
    // unzip dist.zip file and delete it
    await runCommand('unzip ./dist.zip'); 
    await runCommand(`rm -rf ${config.PATH}/dist.zip`);
    //将目标目录的dist里面文件移出到目标文件  
    //举个例子 假如我们部署在 /test/html 这个目录下 只有一个网站, 那么上传解压后的文件在 /test/html/dist 里
    //需要将 dist 目录下的文件 移出到 /test/html ;  多网站情况, 如 /test/html/h5  或者 /test/html/admin 都和上面同样道理
    await runCommand(`mv -f ${config.PATH}/dist/*  ${config.PATH}`);
    await runCommand(`rm -rf ${config.PATH}/dist`); //移出后删除 dist 文件夹
    SSH.dispose(); //断开连接
  } catch (error) {
    errorLog(error);
    errorLog('上传失败!');
    process.exit(); //退出流程
  }
  loading.stop();
}



//------------发布程序---------------
const runUploadTask = async () => {
  console.log(chalk.yellow(`--------->  前端自动部署工具启动  <---------`));
  //打包
  await compileDist();
  //压缩
  await zipDist();
  //连接服务器上传文件
  await uploadZipBySSH();
  successLog('部署成功!');
  process.exit();
}

// 开始前的配置检查
/**
 * 
 * @param {Object} conf 配置对象
 */
const checkConfig = (conf:config) => {
  const checkArr = Object.entries(conf);
  checkArr.map(it => {
    const key: keyof config = it[0] as keyof config;
    if (key === 'PATH' && conf[key] === '/') { //上传zip前会清空目标目录内所有文件
      errorLog('PATH 不能是服务器根目录!');
      process.exit(); //退出流程
    }
    if (!conf[key]) {
      errorLog(`配置项 ${key} 不能为空`);
      process.exit(); //退出流程
    }
  })
}

// 执行交互后 启动发布程序
inquirer.prompt([{
  type: 'list',
  message: '请选择发布环境',
  name: 'env',
  choices: [{
    name: '测试环境',
    value: 'development'
  }, {
    name: '正式环境',
    value: 'production'
  }]
}]).then(
  (answers) => {
    config = configs[answers.env as keyof configsType];
    checkConfig(config); // 检查
    runUploadTask(); // 发布
  }
);

