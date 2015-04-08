'use strict'

var debug = require('debug')('httq:warez:requestToMessage')
var format = require('util').format
var url = require('url')
var _ = require('lodash')

module.exports = requestToMessage

function requestToMessage(config, ctx, next) {

    next(null, function(req, res, next) {

        debug(format('Generating message from request: %s', req.url))

        ctx.message = ctx.message || {}
        ctx.message.content = req.body
        ctx.message.headers = {
            request: {
                method: req.method,
                url: req.url,
                query: url.parse(req.url, true).query,
                headers: req.headers,
                params: req.params
            }
        }

        next()
    })
}