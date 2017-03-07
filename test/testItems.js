var convert = require('../index');
var path = require('path');

convert.run(path.join(__dirname, '/pages/gridLayoutByItems'), function (err, _result) {
    console.log(_result)
});