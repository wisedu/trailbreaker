let utils = require('./utils');

/**
 * 生成可转换成栅格html的数据结构
 * @param _gridData html页面中的layout模块名和子item模块名列表
 * @param rowsStyle layout的行设置数据
 * @param colsStyle layout的列设置数据
 */
module.exports.init = function(_gridData, rowsStyle, colsStyle) {
     return init(_gridData, rowsStyle, colsStyle);
};


function init(_gridData, rowsStyle, colsStyle) {
    let makeData = makeGridRowData(_gridData, [], rowsStyle, colsStyle);
    //重新copy数据,避免数据污染
    let newMackData = utils.cloneJsonObject(makeData);
    resetRowColSpan(newMackData, rowsStyle, colsStyle);
    return newMackData;
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