'use strict'

var debug = require('debug')('httq:warez:requestToTemplateVars')
var format = require('util').format
var url = require('url')

module.exports = requestToTemplateVars

function requestToTemplateVars(config, ctx, next) {
    next(null, function(req, res, next) {
        debug('Pillaging %s', req.url)

        req.httq = req.httq || {}
        req.httq.templateVars = req.httq.templateVars || {}
        req.httq.templateVars.request = {
            method: req.method,
            url: url.parse(req.url),
            params: req.params,
            headers: req.headers,
            query: req.query
        }
        next()
    })
}