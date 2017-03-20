var cgl2s = require('./src/init');

module.exports.run = function(_html, _style) {
    return cgl2s.convert(_html, _style);
};