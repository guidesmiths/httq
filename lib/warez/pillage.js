var debug = require('debug')('httq:index')
var format = require('util').format
var url = require('url')

module.exports = pillage

function pillage(config, ctx, next) {
    next(null, function(req, res, next) {
        debug('Pillaging %s', req.url)
        ctx.method = req.method
        ctx.url = url.parse(req.url),
        ctx.params = req.params
        ctx.headers = req.headers
        ctx.query = req.query
        next()
    })
}