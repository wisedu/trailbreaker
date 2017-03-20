var convert = require('../index');
var utils = require('./utils');
var path = require('path');
let async = require('async');


async.parallel([
        function(parallelCallback) {
            utils.readFile(path.join(path.resolve(), 'test/pages/gridLayoutByAreas/gridLayoutByAreas.html'), parallelCallback);
        },
        function(parallelCallback) {
            utils.readFile(path.join(path.resolve(), 'test/pages/gridLayoutByAreas/gridLayoutByAreas.css'), parallelCallback);
        }
    ],
    function(err, _results) {
        var data = convert.run(_results[0].data, _results[1].data);
        console.log(data)
    });

