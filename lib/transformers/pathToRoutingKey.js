'use strict'

module.exports = function(config) {

    config = config || {}

    return function(req, next) {
        var routingKey = req.path.substr(1).replace(/\//g, '.')
        var method = config.method_alt && config.method_alt[req.method] || req.method.toLowerCase()
        next(null, {
            routingKey: config.method ? routingKey + '.' + method : routingKey,
            content: config.body_only ? req.body : { headers: req.headers, body: req.body }
        })
    }
}