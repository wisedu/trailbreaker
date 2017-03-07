let cheerio = require('cheerio');

/**
 * 将layout布局的html结构转换成栅格的html结构
 * @param gridSystemData layout对应的栅格数据
 * @param templateHtml 原始的layout页面html内容
 */
module.exports.init = function(gridSystemData, templateHtml) {
    return init(gridSystemData, templateHtml);
};

function init(gridSystemData, templateHtml) {
    return refactorTemplateToGridSystem(gridSystemData, templateHtml);
}

/**
 * 重构模板html成栅格系统的html
 * @param gridSystemData
 * @param templateHtml
 * @returns {*}
 */
function refactorTemplateToGridSystem(gridSystemData, templateHtml) {
    let $ = cheerio.load(templateHtml);

    //循环所有的编译出的栅格布局
    for(let gridSystemItem of gridSystemData){
        //栅格布局对应的grid layout模块名称
        let gridName = gridSystemItem.name;
        //栅格布局模块的html
        let gridSystemHtml = gridSystemItem.html;

        //grid layout的dom对象
        let $gridLayout = $(`[grid-layout="${gridName}"]`);

        let $gridSystem = cheerio.load(gridSystemHtml);
        //循环该grid layout下的子节点,将内容copy到栅格上,再将栅格回帖到grid layout页面,然后删除grid layout
        $gridLayout.children().each(function () {
            let $gridItem = $(this);
            let attributes = this.attribs;
            let gridItemName = $gridItem.attr('grid-item');
            let gridItemHtml = $gridItem.html();
            let $gridSystemItem = $gridSystem(`[grid-item="${gridItemName}"]`);
            $gridSystemItem.html(gridItemHtml);

            //保留grid layout中添加的属性
            addAttributes($gridSystemItem, attributes);
        });

        //给每个块添加外框和保留属性
        let $wrap = cheerio.load(`<div></div>`);
        let $wrapDiv = $wrap('div');
        addAttributes($wrapDiv, $gridLayout[0].attribs);

        $gridLayout.before($wrapDiv.html($gridSystem.html()));
        $gridLayout.remove();
    }

    return $.html();
}

/**
 * 复制属性到新的dom上
 * @param $dom
 * @param _attrs 属性列表
 */
function addAttributes($dom, _attrs) {
    for(let key in _attrs){
        if(key === 'class'){
            $dom.addClass(_attrs[key]);
        }else{
            $dom.attr(key, _attrs[key]);
        }
    }
}