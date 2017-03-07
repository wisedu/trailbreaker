let async = require('async');

let utils = require('./utils');
let styleData = require('./getStyleData');
let generateGridSystemData = require('./generateGridSystemData');
let refactorPageToGridSystemHtml = require('./refactorPageToGridSystemHtml');
let generateGridSystemHtmlByData = require('./generateGridSystemHtmlByData');

/**
 * 对外暴露的转换接口
 * @param _folder 模板文件夹路径
 * @param callback 回调
 */
module.exports.convert = function(_folder, callback) {
    convert(_folder, callback);
};

/**
 * 执行转换
 * @param _folder 模板文件夹路径
 * @param topCallback 回调
 */
function convert(_folder, topCallback) {
    //获取该文件夹下的html和样式文件路径
    let filesPath = getLayoutHtmlAndStylePath(_folder);
    let styleFilePath = filesPath.style;
    let htmlFilePath = filesPath.html;

    async.waterfall([
        /**
         * 读取html文件样式文件的内容
         * @param callback
         */
        function(callback) {
            getLayoutHtmlAndStyleContent(styleFilePath, htmlFilePath, callback);
        },
        function(_result, callback) {
            let htmlContent = _result.html;
            let styleContent = _result.style;

            //从样式文件里面取出grid layout布局的样式设置
            let layoutStyleData = styleData.get(htmlContent, styleContent);

            //将取到的grid layout布局设置,转换成json格式的数据,以便转换成栅格
            let systemDataList = [];
            for(let layoutItem of layoutStyleData){
                let data = layoutItem.data;
                let rows = data.rows;
                let columns = data.columns;
                let area = data.area;
                let name = layoutItem.name;

                //将grid layout的样式设置生成可转换成栅格的数据结构
                let gridSystemData = generateGridSystemData.init(area, rows, columns);
                //将生成的栅格数据转换成栅格html
                let html = generateGridSystemHtmlByData.get(gridSystemData);
                systemDataList.push({
                    name: name,
                    html: html
                })
            }

            //将grid layout的html内容替换成生成的栅格html
            let gridSystemHtml = refactorPageToGridSystemHtml.init(systemDataList, htmlContent);

            callback(null, gridSystemHtml);

        },
        function(_data, callback) {
            topCallback(null, _data);
        }
    ]);
}

/**
 * 获取html和样式文件路径
 * @param _folder
 * @returns data
 * @returns data.style 样式路径
 * @returns data.html html路径
 */
function getLayoutHtmlAndStylePath(_folder) {
    //获取该文件夹下所有的页面路径
    let fileList = utils.scanFolder(_folder).files;
    //获取的布局样式文件
    let styleFilePath = '';
    //html文件
    let layoutHtmlPath = '';

    //取出样式文件和html文件
    for(let _file of fileList){
        if(/\.(css)|(scss)|(sass)|(less)$/.test(_file)){
            styleFilePath = _file;
        }else if(/\.html$/.test(_file)){
            layoutHtmlPath = _file;
        }

        if(styleFilePath && layoutHtmlPath){
            break;
        }
    }

    return {
        style: styleFilePath,
        html: layoutHtmlPath
    };
}

/**
 * 获取html和样式文件的内容
 * @param styleFilePath 样式文件路径
 * @param htmlFilePath html文件路径
 * @param callback
 * @param callback.style 样式内容
 * @param callback.html html内容
 */
function getLayoutHtmlAndStyleContent(styleFilePath, htmlFilePath, callback) {
    async.parallel([
            /**
             * 读取样式文件内容
             */
                function(parallelCallback) {
                utils.readFile(styleFilePath, parallelCallback);
            },
            /**
             * 读取html文件内容
             * @param parallelCallback
             */
                function(parallelCallback) {
                utils.readFile(htmlFilePath, parallelCallback);
            }
        ],
        function(err, _results) {
            callback(null, {
                style: _results[0].data,
                html: _results[1].data
            });
        });
}
