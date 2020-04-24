/**
 * @file 下载仓库、修改配置信息
 * @author hanxiaofang
 */
const inquirer = require('inquirer');
const fs = require('fs');
const fse = require('fs-extra'); // 增加了一些原生fs没有的操作，更方便
const download = require('download-git-repo');
const {TEMPLATE_GIT_REPO, INJECT_FILES} = require('./constants.js');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const memFs = require('mem-fs');
const editor = require('mem-fs-editor'); // 负责模板的复制、和字符串嵌入，依赖于mem-fs
const { getDirFileName } = require('./utils');
const { exec } = require('child_process');

function Project(options) {
    console.log('optins = ', options);
    // config配置问询命令行中的数据
    this.config = Object.assign({
        name: '',
        description: '',
        version: '1.0.0'
    }, options);
    const store = memFs.create();
    this.memFsEditor = editor.create(store);
}

Project.prototype.create = function () {
    this.inquire()
        .then(answer => {
            this.config = Object.assign(this.config, answer);
            this.generate();
        });
};

Project.prototype.inquire = function () {
    const prompts = [];
    const {name, description} = this.config;

    // 询问name、description，version
    if (typeof name !== 'string') {
        prompts.push({
            type: 'input',
            name: 'name',
            message: '请输入项目名',
            validate(input) {
                if (!input) {
                    return '项目名不能为空';
                }
                if (fse.existsSync(input)) {
                    return '当前目录已存在同名项目，请更换项目名';
                }
                return true;
            }
        });
    } else if (fse.existsSync(name)) {
        prompts.push({
            type: 'input',
            name: 'name',
            message: '请输入项目名',
            validate(input) {
                if (!input) {
                    return '项目名不能为空';
                }
                // 输入name后，是否存在相同目录？
                if (fse.existsSync(input)) {
                    return '当前目录已存在同名项目，请更换项目名';
                }
                return true;
            }
        })
    }
    if (typeof description !== 'string') {
        prompts.push({
            type: 'input',
            name: 'description',
            message: '请输入项目描述'
        });
    }
    if (typeof version !== 'string') {
        prompts.push({
            type: 'input',
            name: 'version',
            message: '请输入版本号'
        });
    }
    return inquirer.prompt(prompts);
};

// 模板替换，source--源文件路径、dest--目标文件路径、data--替换文本字段
Project.prototype.injectTemplate = function(source, dest, data) {
    this.memFsEditor.copyTpl(source, dest, data);
};

Project.prototype.generate = function () {
    const {name, description, version} = this.config;
    const projectPath = path.join(process.cwd(), name); // 当前路径名
    const downloadPath = path.join(projectPath, '__download__'); // 将文件下载到当前路径下的 __download__目录下

    // 下载模板
    const downloadSpinner = ora('正在下载目标模板...');
    downloadSpinner.start();
    download(TEMPLATE_GIT_REPO, downloadPath, {clone: true}, err => {
        if (err) {
            downloadSpinner.color = 'red';
            downloadSpinner.fail(err.message);
            return;
        }

        // 下载成功
        downloadSpinner.color = 'green';
        downloadSpinner.succeed('模板下载成功');

        // 复制文件，从 __donwload__，拷贝到 项目文件夹下
        const copyFiles = getDirFileName(downloadPath);

        copyFiles.forEach(file => {
            fse.copySync(path.join(downloadPath, file), path.join(projectPath, file));
            console.log(`${chalk.green('✔ ')}${chalk.grey(`创建: ${projectName}/${file}`)}`);
        });

        // 复制文件后，替换文件中的内容
        INJECT_FILES.forEach(file => {
            this.injectTemplate(path.join(downloadPath, file), path.join(name, file), {
                name,
                description,
                version
            });
        });
        this.memFsEditor.commit(() => {});
        this.memFsEditor.commit(() => {
            INJECT_FILES.forEach(file => {
                console.log(`${chalk.green('✔ ')}${chalk.grey(`创建: ${projectName}/${file}`)}`);
            });

            fse.remove(downloadPath); // 删除下载的模板
            process.chdir(projectPath); // 进入到项目中

            // git初始化
            // 安装依赖
            const installSpinner = ora(`安装项目依赖 ${chalk.green.bold('npm install')}, 请稍候...`);
            installSpinner.start();
            exec('npm install', (error, stdout, stderr) => {
                if (error) {
                    installSpinner.color = 'red';
                    installSpinner.fail(chalk.red('安装项目依赖失败，请自行安装'));
                } else {
                    installSpinner.color = 'green';
                    installSpinner.succeed('安装依赖成功');
                    console.log(`${stderr}${stdout}`);
                    console.log(chalk.green('创建项目成功！'));
                    console.log(chalk.green('npm run start开始项目！'));
                }
            });
        });
    });
};

module.exports = Project;