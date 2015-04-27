'use strict'

var debug = require('debug')('httq:warez:fireAndForget')
var format = require('util').format
var _ = require('lodash')

module.exports = fireAndForget

function fireAndForget(config, ctx, next) {

    next(null, function(req, res, next) {

        debug(format('Publishing message: %s, to publication: %s with routingKey: %s', JSON.stringify(req.httq.message.content, null, 2), config.publication, req.httq.message.routingKey))

        ctx.broker.publish(config.publication, req.httq.message.content, {
            routingKey: req.httq.message.routingKey,
            options: {
                headers: req.httq.message.headers,
            }
        }, function(err, publication) {
            if (err) return next(err)
            publication.on('success', function(messageId) {
                res.status(202).json({ txid: messageId })
            }).on('error', next)
        })
    })
}