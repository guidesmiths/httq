var debug = require('debug')('httq:fireAndForget')
var format = require('util').format

module.exports = function(broker, publication) {

    return function(envelope, res, next) {

        debug(format('Publishing message: %s, to publication: %s with routingKey: %s', JSON.stringify(envelope.content, null, 2), publication, envelope.routingKey))

        broker.publish(publication, envelope.content, envelope.routingKey, function(err, messageId) {
            if (err) return next(err)
            res.status(202).json({ txid: messageId })
        })
    }
}