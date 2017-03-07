/**
 * 通过栅格数据生成栅格html
 * @param _data
 */
module.exports.get = function(_data) {
    return dataConvertIntoHtml(_data);
};

/**
 * 根据数据转换成栅格html
 * @param _data
 */
function dataConvertIntoHtml(_data) {
    let html = '';
    for(let item of _data){
        html += getRow(item);
    }

    return html;
}

/**
 * 生成栅格的html
 * 当有children时,做递归处理
 * @param _data
 * @returns {string}
 */
function getRow(_data) {
    let html = '';
    let col = '';
    let type = _data.type;
    let children = _data.children;
    if(type === 'row'){
        if(children){
            for(let i=0; i<children.length; i++){
                col += getRow(children[i]);
            }
        }else{
            col = getHtml({type: 'col'}).replace('@content', '');
        }
        html = getHtml(_data).replace('@content', col);
    }else{
        if(children){
            for(let i=0; i<children.length; i++){
                col += getRow(children[i]);
            }
        }
        html = getHtml(_data).replace('@content', col);
    }
    return html;
}

/**
 * 获取行或列的html
 * @param _data
 * @returns {string}
 */
function getHtml(_data) {
    let type = _data.type;
    let width = _data.width;
    let height = _data.height;
    let _class = _data.class ? _data.class : '';
    let name = _data.name;

    let style = '';
    if(width){
        style += `width: ${width};`;
    }
    if(height){
        style += `height: ${height};`;
    }
    if(style){
        style = `style="${style}"`;
    }

    let itemName = '';
    if(name){
        itemName = `grid-item="${name}"`;
    }

    return `<div ${itemName} class="${_class}" ${style}>@content</div>`;
}