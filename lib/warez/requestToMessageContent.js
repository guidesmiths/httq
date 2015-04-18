'use strict'

var debug = require('debug')('httq:warez:requestToMessageContent')
var format = require('util').format
var url = require('url')

module.exports = requestToMessageContent

function requestToMessageContent(config, ctx, next) {

    next(null, function(req, res, next) {

        debug(format('Generating message from request: %s', req.url))

        req.httq.message = req.httq.message || {}
        req.httq.message.content = {
            method: req.method,
            url: req.url,
            query: url.parse(req.url, true).query,
            headers: req.headers,
            schema: req.httq.message.schema,
            params: req.params,
            body: req.body,
        }

        next()
    })
}