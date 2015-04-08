'use strict'

var debug = require('debug')('httq:warez:pillage')
var format = require('util').format
var url = require('url')

module.exports = pillage

function pillage(config, ctx, next) {
    next(null, function(req, res, next) {
        debug('Pillaging %s', req.url)
        ctx.templateVars = ctx.templateVars || {}
        ctx.templateVars.request = {
            method: req.method,
            url: url.parse(req.url),
            params: req.params,
            headers: req.headers,
            query: req.query
        }
        next()
    })
}