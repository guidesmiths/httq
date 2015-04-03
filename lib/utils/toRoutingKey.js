'use strict'

module.exports = function(path) {
    return path.substr(1).replace(/\//g, '.')
}