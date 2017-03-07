let cheerio = require('cheerio');

let utils = require('./utils');

/**
 * 获取grid layout的样式设置数据
 * @param _html html文件内容
 * @param _css 样式文件内容
 */
module.exports.get = function(_html, _css) {
    return init(_html, _css);
};


function init(_html, _css) {
    let modulesData = getGridLayoutModuleNames(_html);
    let styleData = getGridLayoutStyleDataByNames(modulesData, _css);
    
    return styleData;
}

/**
 * 获取html内的所有grid layout模块名
 * @param _html html内容
 * @returns {Array}
 */
function getGridLayoutModuleNames(_html) {
    let $ = cheerio.load(_html);
    let modules = [];
    
    $('[grid-layout]').each(function () {
        let $layout = $(this);
        let moduleName = $layout.attr('grid-layout');
        let itemsName = [];
        $layout.children('[grid-item]').each(function () {
            let name = $(this).attr('grid-item');
            itemsName.push(name);
        });

        modules.push({
            layout: moduleName,
            items: itemsName
        });
    });

    return modules;
}

/**
 * 获取grid layout模块的样式
 * @param layoutModules 模块名称列表
 * @param styleContent 样式内容
 * @returns {Array}
 * @returns item.name 模块名
 * @returns item.data
 * @returns item.data.area grid item分布
 * @returns item.data.rows 行设定
 * @returns item.data.columns 列设定
 */
function getGridLayoutStyleDataByNames(layoutModules, styleContent) {
    let gridLayoutList = [];
    //合并样式文件的多余空格
    styleContent = styleContent.replace(/\s+/g, ' ');

    for(let module of layoutModules){
        let layoutName = module.layout;
        let re = new RegExp(`\\[grid-layout=\"${layoutName}\"\\]\\s*\\{([^}]*)\\}`);
        let match = styleContent.match(re);
        if(match){
            let layoutContent = match[1];
            let layoutItemsData = [];
            if(/grid-template-areas/.test(layoutContent)){
                layoutItemsData = getGridItemsDataFromArea(layoutContent);
            }else{
                layoutItemsData = getGridItemsDataFromItems(layoutContent);
            }

            gridLayoutList.push({
                name: layoutName,
                data: layoutItemsData
            });
        }
    }

    return gridLayoutList;
}

/**
 * 从样式中取到grid item的分布,行、列设定
 * @param _gridStyle
 * @returns {{area: string, rows: Array, columns: Array}}
 * @returns area grid item分布
 * @returns rows 行设定
 * @returns columns 列设定
 */
function getGridItemsDataFromArea(_gridStyle) {
    let gridCssList = _gridStyle.split(';');
    let area = '';
    let rows = [];
    let columns = [];
    for(let _css of gridCssList){
        if(/grid-template-areas/.test(_css)){
            //统计grid中每个块的占位情况
            area = getGridItemSite(_css.split(':')[1]);
        }else if(/grid-template-rows/.test(_css)){
            rows = removeArrayEmptyItem(_css.split(':')[1].replace(/auto/g, '1fr').split(' '));
        }else if(/grid-template-columns/.test(_css)){
            columns = removeArrayEmptyItem(_css.split(':')[1].replace(/auto/g, '1fr').split(' '));
        }
    }

    return {
        area: area,
        rows: rows,
        columns: columns
    }
}

function getGridItemsDataFromItems(_styleContent) {
    
}


/**
 * 根据area,统计grid layout中每个grid节点的占位情况,即行,列的起始占位和结束占位
 * @param _area grid layout中的area字段
 * @returns {Array}
 */
function getGridItemSite(_area) {
    let rowsSplit = _area.replace(/^"/,'').replace(/"$/,'').split('"');
    let rows = [];
    for(let item of rowsSplit){
        item = utils.trim(item);
        if(item){
            rows.push(item.replace(/\s+/g, ' '));
        }
    }

    let rowLen = rows.length;

    let data = {};
    for(let i=0; i<rowLen; i++){
        let row = rows[i];
        let cols = row.split(' ');
        let colLen = cols.length;
        for(let k=0; k<colLen; k++){
            let newData = {
                row: {
                    start: i,
                    end: i
                },
                col: {
                    start: k,
                    end: k
                },
                name: cols[k]
            };

            //若该grid item的数据还没有存在则直接加入,若存在了则在原有的数据上追加行列情况
            if(!data[cols[k]]){
                data[cols[k]] = newData;
            }else{
                resetGridItemData(data[cols[k]], newData);
            }
        }
    }

    let gridItemList = [];
    for(let key in data){
        gridItemList.push(data[key]);
    }
    return gridItemList;
}

/**
 * 判断当前的行列情况,若比起始数小或比结束数据大则重置原有起始数据或结束数据
 * @param _exist 已存在的数据
 * @param _new 需要判断是否添加的新数据
 */
function resetGridItemData(_exist, _new) {
    if(_exist.row.start > _new.row.start){
        _exist.row.start = _new.row.start;
    }

    if(_exist.row.end < _new.row.end){
        _exist.row.end = _new.row.end;
    }

    if(_exist.col.start > _new.col.start){
        _exist.col.start = _new.col.start;
    }

    if(_exist.col.end < _new.col.end){
        _exist.col.end = _new.col.end;
    }
}

/**
 * 移除空数据
 * @param _arr
 */
function removeArrayEmptyItem(_arr) {
    let newArray = [];
    for(let item of _arr){
        if(item){
            newArray.push(item);
        }
    }
    return newArray;
}