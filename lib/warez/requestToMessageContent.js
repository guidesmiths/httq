'use strict'

var debug = require('debug')('httq:warez:requestToMessageContent')
var format = require('util').format
var url = require('url')

module.exports = requestToMessageContent

function requestToMessageContent(config, ctx, next) {

    next(null, function(req, res, next) {

        debug(format('Generating message from request: %s', req.url))

        ctx.message = ctx.message || {}
        ctx.message.content = {
            method: req.method,
            url: req.url,
            query: url.parse(req.url, true).query,
            headers: req.headers,
            params: req.params,
            body: req.body,
        }

        next()
    })
}