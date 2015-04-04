'use strict'

module.exports = function(config) {

    config = config || {}

    return function(req, next) {
        var routingKey = req.path.substr(1).replace(/\//g, '.')
        var method = config.alt && config.alt[req.method] || req.method.toLowerCase()
        next(null, config.method ? routingKey + '.' + method : routingKey)
    }
}