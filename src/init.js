let styleData = require('./getStyleData');
let generateGridSystemData = require('./generateGridSystemData');
let refactorPageToGridSystemHtml = require('./refactorPageToGridSystemHtml');
let generateGridSystemHtmlByData = require('./generateGridSystemHtmlByData');

/**
 * 对外暴露的转换接口
 * @param _folder 模板文件夹路径
 * @param callback 回调
 */
module.exports.convert = function(_html, _style) {
    return convert(_html, _style);
};

/**
 * 执行转换
 * @param _folder 模板文件夹路径
 * @param topCallback 回调
 */
function convert(_html, _style) {
    //从样式文件里面取出grid layout布局的样式设置
    let layoutStyleData = styleData.get(_html, _style);

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
    let gridSystemHtml = refactorPageToGridSystemHtml.init(systemDataList, _html);

    return gridSystemHtml;
}

