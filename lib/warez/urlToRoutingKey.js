'use strict'

var debug = require('debug')('httq:warez:urlToRoutingKey')
var format = require('util').format

module.exports = urlToRoutingKey

function urlToRoutingKey(config, ctx, next) {

    next(null, function(req, res, next) {
        debug(format('Building routing key from request: %s', req.url))
        ctx.routingKey = config.method ? includeMethod(mapMethod(req.method), getBasicRoutingKey(req.path))
                                       : getBasicRoutingKey(req.path)
        next()
    })

    function getBasicRoutingKey(path) {
        return path.substr(1).replace(/\//g, '.')
    }

    function mapMethod(method) {
        return config.method.mapping && config.method.mapping[method] || method
    }

    function includeMethod(method, routingKey) {
        return config.method.prefix ? method + '.' + routingKey
                                    : routingKey + '.' + method
    }
}