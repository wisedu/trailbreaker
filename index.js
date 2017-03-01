var cgl2s = require('./src/cssGridLayoutToSystem');

module.exports.run = function(_srcFolder, callback) {
    return cgl2s.convert(_srcFolder, callback);
};