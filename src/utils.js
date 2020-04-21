/**
 * @file 通用函数配置
 * @author hanxiaofang
 */
const path = require('path');
const fse = require('fs-extra');
const {INJECT_FILES} = require('./constants');

/**
 * @description 获取根目录
 */
function getRootPath() {
    return path.resolve(__dirname, './..');
}

/**
 * @description 获取package的版本号
 */
function getPackageVersion() {
    const version = require(path.join(getRootPath(), 'package.json')).version;
    return version;
}

/**
 * @description 拷贝项目
 * @param {string} dir
 */
function getDirFileName(dir) {
    try {
        const files = fs.readdirSync(dir);
        const filesToCopy = [];
        files.forEach(file => {
            // package.json文件已存在，不用再重复拷贝
            if (file.indexOf(INJECT_FILES) > -1) {
                return;
            }
            filesToCopy.push(file);
        });
        return filesToCopy;
    } catch (e) {
        return [];
    }
}

exports.getDirFileName = getDirFileName;

function logPackageVersion() {
    const msg = `hanxiaofang-cli version: ${getPackageVersion()}`;
    console.log();
    console.log(msg);
    console.log();
}
exports.logPackageVersion = logPackageVersion;
