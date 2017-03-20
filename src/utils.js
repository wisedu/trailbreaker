var fs = require('fs');
var path = require('path');

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


