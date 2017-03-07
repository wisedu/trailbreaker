var cgl2s = require('./src/init');

module.exports.run = function(_srcFolder, callback) {
    return cgl2s.convert(_srcFolder, callback);
};