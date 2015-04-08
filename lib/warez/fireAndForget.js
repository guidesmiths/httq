'use strict'

var debug = require('debug')('httq:fireAndForget')
var format = require('util').format

module.exports = fireAndForget


function fireAndForget(config, ctx, next) {

    next(null, function(req, res, next) {

        debug(format('Publishing message: %s, to publication: %s with routingKey: %s', JSON.stringify(ctx.payload, null, 2), ctx.publication, ctx.routingKey))

        ctx.broker.publish(config.publication, ctx.payload, ctx.routingKey, function(err, messageId) {
            if (err) return next(err)
            res.status(202).json({ txid: messageId })
        })
    })
}