var fs = require('fs');
var path = require('path');


/**
 * 同步遍历文件夹，返回所有文件夹和文件路径
 * @param _path
 * @returns {{files: Array, folders: Array}}
 */
module.exports.scanFolder = function(_path) {
    return scanFolder(_path);
};

/**
 * 异步读文件
 * @param readPath 读取的文件地址
 * @param callback
 */
module.exports.readFile = function(readPath, callback) {
    readFile(readPath, callback);
};

/**
 * 去掉字符串两端的空格
 * @param str
 */
module.exports.trim = function(str) {
    return trim(str);
};

/**
 * 判断数据是否是json对象
 * @param obj
 * @returns {boolean}
 */
module.exports.isJson = function(obj) {
    return typeof(obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && !obj.length;
};

/**
 * 判断数据是否是数组
 * @param obj
 * @returns {boolean}
 */
module.exports.isArray = function(obj) {
    return toString.apply(obj) === '[object Array]';
};

/**
 * 深度clone纯JSON对象
 * @param obj
 * @returns {JSON}
 */
module.exports.cloneJsonObject = function(json) {
    let target = null;
    if (this.isJson(json)) {
        target = {};
    } else if (this.isArray(json)) {
        target = [];
    }
    if (target) {
        for (let key in json) {
            target[key] = this.cloneJsonObject(json[key]);
        }
        return target;
    }
    return json;
};

/**
 * 去掉字符串两端的空格
 * @param str
 * @returns {string}
 */
function trim(str) {
    var newStr = '';
    if (str) {
        var reg = /^\s*|\s*$/g;
        newStr = str.replace(reg, '');
    }
    return newStr;
}

function scanFolder(_path) {
    var fileList = [],
        folderList = [],
        walk = function(path, fileList, folderList) {
            files = fs.readdirSync(path);
            files.forEach(function(item) {
                var tmpPath = /\/$/.test(path) ? path + item : path + '/' + item,
                    stats = fs.statSync(tmpPath);

                if (stats.isDirectory()) {
                    walk(tmpPath, fileList, folderList);
                    folderList.push(tmpPath);
                } else {
                    fileList.push(tmpPath);
                }
            });
        };

    walk(_path, fileList, folderList);

    return {
        'files': fileList,
        'folders': folderList
    };
}

function readFile(readPath, callback) {
    fs.readFile(readPath, 'utf-8', function(err, data) {
        if (err) {
            console.log(err);
            return callback(null, { 'type': 'error', 'message': err, 'path': readPath });
        } else {
            if (/\.json$/.test(readPath)) {
                try {
                    data = JSON.parse(data);
                    callback(null, { 'type': 'success', 'data': data, 'path': readPath });
                } catch (err) {
                    console.log(err);
                    callback(null, { 'type': 'error', 'message': err, 'path': readPath });
                }
            } else {
                callback(null, { 'type': 'success', 'data': data, 'path': readPath });
            }
        }
    });
}
