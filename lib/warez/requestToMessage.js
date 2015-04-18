'use strict'

var debug = require('debug')('httq:warez:requestToMessage')
var format = require('util').format
var url = require('url')
var _ = require('lodash')

module.exports = requestToMessage

function requestToMessage(config, ctx, next) {

    next(null, function(req, res, next) {

        debug(format('Generating message from request: %s', req.url))

        req.httq = req.httq || {}
        req.httq.message = req.httq.message || {}

        req.httq.message = req.httq.message || {}
        req.httq.message = _.merge(req.httq.message, {
            content: req.body,
            headers: {
                httq: {
                    method: req.method,
                    url: req.url,
                    query: url.parse(req.url, true).query,
                    headers: req.headers,
                    schema: req.httq.message.schema,
                    params: req.params
                }
            }
        })

        next()
    })
}