'use strict'

var requestToken = require('request-token')

module.exports = function(config) {

    var generateRoutingKey = requestToken(config).generate

    return function(req, next) {
        generateRoutingKey(req, function(err, routingKey) {
            next(null, {
                routingKey: routingKey,
                content: { headers: req.headers, body: req.body }
            })
        })
    }
}