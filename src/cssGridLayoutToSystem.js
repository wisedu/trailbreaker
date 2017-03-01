let utils = require('./utils');
let async = require('async');
let cheerio = require('cheerio');
let path = require('path');

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

            //获取每个模块下的grid layout名称
            let layoutModuleNames = getGridLayoutModuleNames(htmlContent);

            //解析样式文件,取出grid layout模块对应的样式设置
            let layoutStyleData = getGridLayoutStyleDataByNames(layoutModuleNames, styleContent);

            //将取到的grid layout布局设置,转换成json格式的数据,以便转换成栅格
            let systemDataList = [];
            for(let layoutItem of layoutStyleData){
                let data = layoutItem.data;
                let rows = data.rows;
                let columns = data.columns;
                let area = data.area;
                let name = layoutItem.name;

                //拼装行数据
                let mackData = makeGridRowData(area, [], rows, columns);
                //重新copy数据,避免数据污染
                let newMackData = utils.cloneJsonObject(mackData);
                //重置每个父层列的跨列数据
                resetRowColSpan(newMackData, rows, columns);
                //将生成的json数据转换成栅格html
                let html = dataConvertIntoHtml(newMackData);
                systemDataList.push({
                    name: name,
                    html: html
                })
            }

            //将grid layout的html内容替换成生成的栅格html
            let gridSystemHtml = refactorTemplateToGridSystem(systemDataList, htmlContent);

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

/**
 * 获取html内的所有grid layout模块名
 * @param htmlContent html内容
 * @returns {Array}
 */
function getGridLayoutModuleNames(htmlContent) {
    let $ = cheerio.load(htmlContent);
    let names = [];
    $('[grid-layout]').each(function () {
        let name = $(this).attr('grid-layout');
        names.push(name);
    });

    return names;
}

/**
 * 获取grid layout模块的样式
 * @param layoutModuleNames 模块名称列表
 * @param styleContent 样式内容
 * @returns {Array}
 * @returns item.name 模块名
 * @returns item.data
 * @returns item.data.area grid item分布
 * @returns item.data.rows 行设定
 * @returns item.data.columns 列设定
 */
function getGridLayoutStyleDataByNames(layoutModuleNames, styleContent) {
    let gridLayoutList = [];
    //合并空格
    styleContent = styleContent.replace(/\s+/g, ' ');

    for(let name of layoutModuleNames){
        let re = new RegExp(`\\[grid-layout=\"${name}\"\\]\\s*\\{([^}]*)\\}`);
        let match = styleContent.match(re);
        if(match){
            gridLayoutList.push({
                name: name,
                data: getGridLayoutAreaData(match[1])
            });
        }
    }

    return gridLayoutList;
}

/**
 * 从样式中取到grid item的分布,行、列设定
 * @param css
 * @returns {{area: string, rows: Array, columns: Array}}
 * @returns area grid item分布
 * @returns rows 行设定
 * @returns columns 列设定
 */
function getGridLayoutAreaData(css) {
    let gridCssList = css.split(';');
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


/**
 * 根据子列情况设置行的跨列数据
 * @param makeGridData 一个grid layout的数据
 * @param rows 行设置情况
 * @param columns 列设置情况
 */
function resetRowColSpan(makeGridData, rows, columns) {
    for(let item of makeGridData){
        let children = item.children;
        if(item.type === 'row'){
            let rowCol = item.col;
            let rowColStart = rowCol.start;
            let rowColEnd = rowCol.end;
            for(let child of children){
                let childCol = child.col;
                let childColStart = childCol.start;
                let childColEnd = childCol.end;

                if(rowColStart > childColStart){
                    rowCol.start = childColStart;
                }
                if(rowColEnd < childColEnd){
                    rowCol.end = childColEnd;
                }
            }

            setColClass(item, rows, columns);
        }
        if(children.length > 0){
            resetRowColSpan(children, rows, columns);
        }
    }
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
 * 拼装行数据
 * @param _gridData {Array} grid块的数据列表,或列里的items数据
 * @param rowsData {Array} 第一次时是空数组,后面则是列里的children数据
 */
function makeGridRowData(_gridData, rowsData, rowsStyle, colsStyle) {
    //对数据进行排序,按行跨度从大到小进行
    sortDataBySpan(_gridData, 'row');

    for(let item of _gridData){
        let row = item.row;
        let col = item.col;
        let rowStart = row.start;
        let rowEnd = row.end;

        let currentRowItemData = {
            row: row,
            col: col,
            type: 'row',
            items: [item],
            class: 'bh-row',
            children: []
        };

        if(rowsData.length === 0){
            rowsData.push(currentRowItemData);
        }else{
            //判断当前数据的起始行若是在已存在的数据的行跨度里,则将其加入该行,否则添加新的一行
            let isAddToExistData = false;
            for(let existRow of rowsData){
                let existRowStart = existRow.row.start;
                let existRowEnd = existRow.row.end;
                if(rowStart === existRowStart || rowStart === existRowEnd || (rowStart > existRowStart && rowStart < existRowEnd)){
                    isAddToExistData = true;
                }else if(existRowStart > rowStart && existRowEnd < rowStart){
                    existRow.row.start = rowStart;
                    isAddToExistData = true;
                }

                if(isAddToExistData){
                    if(rowEnd > existRowEnd){
                        existRow.row.end = rowEnd;
                    }
                    existRow.items.push(item);
                    break;
                }
            }

            if(!isAddToExistData){
                rowsData.push(currentRowItemData);
            }
        }
    }

    //对已生成的行数据按先后顺序进行排序
    sortData(rowsData, 'row');

    //对每行生成列数据
    for(let row of rowsData){
        makeGridColData(row, rowsStyle, colsStyle);
    }

    return rowsData;
}

/**
 * 对每行生成列数据
 * 若每列只有一条数据,则不再递归生成行数据
 * @param _row
 */
function makeGridColData(_row, rowsStyle, colsStyle) {
    let items = _row.items;

    //对数据进行排序,按列跨度从大到小进行
    sortDataBySpan(items, 'col');

    for(let item of items){
        let row = item.row;
        let col = item.col;
        let colStart = col.start;
        let colEnd = col.end;

        let currentRowItemData = {
            col: col,
            row: row,
            type: 'col',
            items: [item],
            children: []
        };

        if(_row.children === 0){
            _row.children.push(currentRowItemData);
        }else{
            let isAddToExistData = false;
            for(let existCol of _row.children){
                let existColStart = existCol.col.start;
                let existColEnd = existCol.col.end;
                if(colStart === existColStart || colStart === existColEnd || (colStart > existColStart && colStart < existColEnd)){
                    isAddToExistData = true;
                }else if(existColStart > colStart && existColEnd < colStart){
                    existCol.col.start = colStart;
                    isAddToExistData = true;
                }

                if(isAddToExistData){
                    if(colEnd > existColEnd){
                        existCol.col.end = colEnd;
                    }
                    existCol.items.push(item);
                    break;
                }
            }

            if(!isAddToExistData){
                _row.children.push(currentRowItemData);
            }
        }
    }

    sortData(_row.children, 'col');

    for(let col of _row.children){
        if(col.items.length > 1){
            makeGridRowData(col.items, col.children, rowsStyle, colsStyle);
        }else{
            col.name = col.items[0].name;
        }
    }
}

/**
 * 计算并设置每行内列的class
 * @param _row
 */
function setColClass(_row, rowsStyle, colsStyle) {
    //自动根据列数,计算出栅格类 start
    let min = null;
    let max = null;
    for(let col of _row.children){
        let start = col.col.start;
        let end = col.col.end;
        if(typeof min === 'object'){
            min = start;
        }else{
            if(start < min){
                min = start;
            }
        }

        if(typeof max === 'object'){
            max = end;
        }else{
            if(end > max){
                max = end;
            }
        }
    }

    let colCount = max - min + 1;
    let oneColNum = 12/colCount;

    for(let col of _row.children){
        let start = col.col.start;
        let end = col.col.end;
        let coefficient = end - start + 1;
        let _class = `bh-col-md-${oneColNum * coefficient}`;
        col.class = _class;
    }
    //自动根据列数,计算出栅格类  end


    //根据grid layout中设置的列宽,重置上面计算出的栅格样式类  start
    let rowCol = _row.col;
    let rowColStart = rowCol.start;
    let rowColEnd = rowCol.end;
    //获取该列宽范围内的宽度设置
    let colsStyleRange = [];
    //收集所有的px数据
    let colsPxArray = [];
    //列宽数组内的fr总数
    let frCount = 0;
    /**
     * 是否要进行再计算
     * 当出现px或出现大于1fr的设置时,才需要进行再计算
     * @type {boolean}
     */
    let isResetFlag = false;
    for(let i=rowColStart; i<=rowColEnd; i++){
        let colStyleItem = colsStyle[i];
        colsStyleRange.push(colStyleItem);
        let frMatch = colStyleItem.match(/(\d*)fr/);
        if(frMatch){
            let frNum = parseInt(frMatch[1], 10);
            frCount += frNum;
            if(frNum > 1){
                isResetFlag = true;
            }
        }else{
            isResetFlag = true;
            if(colStyleItem){
                colsPxArray.push(colStyleItem);
            }
        }
    }

    //计算出当前列宽设置所对应的栅格类或width
    if(isResetFlag){
        for(let col of _row.children){
            computeGridLayoutWidth(_row, col, colsStyle, colsPxArray, frCount);
        }
    }

    //根据grid layout中设置的列宽,重置上面计算出的栅格样式类  end
}

function computeGridLayoutWidth(_parent, _col, _colsStyle, _colsPxArray, _frCount) {
    let colStart = _col.col.start;
    let colEnd = _col.col.end;
    let parentColStart = _parent.col.start;
    let parentColEnd = _parent.col.end;
    if(colStart === parentColStart && colEnd === parentColEnd){
        _col.class = 'bh-col-md-12';
    }else{
        let currentColPxList = [];
        let currentColFrCount = 0;
        for(let i=colStart; i<=colEnd; i++){
            let colStyleItem = _colsStyle[i];
            if(/px/.test(colStyleItem)){
                currentColPxList.push(colStyleItem);
            }else{
                currentColFrCount += parseInt(colStyleItem.match(/(\d*)fr/)[1], 10);
            }
        }
        let style = '';

        let allLosePx = _colsPxArray.length > 0 ? `(100% - ${_colsPxArray.join(' - ')})` : '';
        let allFr = _frCount ? ` / ${_frCount}` : '';
        let currentFr = currentColFrCount ? ` * ${currentColFrCount}` : '';
        let currentPx = currentColPxList.length > 0 ? ` + ${currentColPxList.join(' + ')}` : '';


        //当父节点同时存在px和fr的情况
        if(_colsPxArray.length > 0 && _frCount){

            //当前列只有一列,即不跨列的情况
            if(colStart === colEnd){
                //当该列是px的情况
                if(currentColPxList.length === 1){
                    style = `${currentColPxList[0]}`;
                //当该列是fr的情况
                }else{
                    style = `calc(${allLosePx} ${allFr} ${currentFr})`;
                }

            //当前列出现跨列的情况
            }else{
                //当前列既有px又有fr存在的情况
                if(currentColPxList.length > 0 && currentColFrCount){
                    style = `calc(${allLosePx} ${allFr} ${currentFr} ${currentPx})`;
                    //只有fr存在的情况
                }else if(currentColPxList.length === 0){
                    style = `calc(${allLosePx} ${allFr} ${currentFr})`;
                    //只有px存在的情况
                }else{
                    let width = 0;
                    for(let px of currentColPxList){
                        width += parseInt(px, 10);
                    }
                    style = width+'px';
                }
            }
        // 当父节点所占列只有fr的情况
        }else if(_frCount){
            style = `calc(100% / ${_frCount} * ${currentColFrCount})`;
        //当父节点只存在px的情况
        }else{
            let width = 0;
            for(let px of currentColPxList){
                width += parseInt(px, 10);
            }
            style = width+'px';
        }

        _col.width = style;
    }
}

/**
 * 将数组按照从小到大的排序
 * @param arr 要排序的数组
 * @param field 数组内要判断的字段
 * @returns {*}
 */
function sortData(arr, field) {
    var temp;
    var exchange;
    for(var i=0; i<arr.length; i++) {
        exchange = false;
        for(var j=arr.length-2; j>=i; j--) {
            if((arr[j+1])[field]['start'] < (arr[j])[field]['start']) {
                temp = arr[j+1];
                arr[j+1] = arr[j];
                arr[j] = temp;
                exchange = true;
            }
        }
        if(!exchange) break;
    }
    return arr;
}

/**
 * 将数据按照行或列跨度从大到小进行排序
 * @param arr 排序数组
 * @param field 要排序的字段,rows或cols
 * @returns {*}
 */
function sortDataBySpan(arr, field) {
    var temp;
    var exchange;
    for(var i=0; i<arr.length; i++) {
        exchange = false;
        for(var j=arr.length-2; j>=i; j--) {
            if(((arr[j+1])[field]['end'] - (arr[j+1])[field]['start']) > ((arr[j])[field]['end'] - (arr[j])[field]['start'])) {
                temp = arr[j+1];
                arr[j+1] = arr[j];
                arr[j] = temp;
                exchange = true;
            }
        }
        if(!exchange) break;
    }
    return arr;
}

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
