'use strict'

var debug = require('debug')('httq:warez:requestToPayload')
var format = require('util').format
var url = require('url')

module.exports = requestToPayload

function requestToPayload(config, ctx, next) {

    next(null, function(req, res, next) {

        debug(format('Generating payload from request: %s', req.url))

        ctx.payload = {
            headers: req.headers,
            body: req.body,
            url: url.parse(req.url, true)
        }

        next()
    })
}