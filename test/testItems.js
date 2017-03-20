var convert = require('../index');
var path = require('path');
var utils = require('./utils');
let async = require('async');


async.parallel([
        function(parallelCallback) {
            utils.readFile(path.join(path.resolve(), 'test/pages/gridLayoutByItems/gridLayoutByItems.html'), parallelCallback);
        },
        function(parallelCallback) {
            utils.readFile(path.join(path.resolve(), 'test/pages/gridLayoutByItems/gridLayoutByItems.css'), parallelCallback);
        }
    ],
    function(err, _results) {
        var data = convert.run(_results[0].data, _results[1].data);
        console.log(data)
    });