var debug = require('debug')('httq:fireAndForget')
var format = require('util').format

module.exports = function(broker, publication, toRoutingKey) {

    return function fireAndForget(req, res, next) {

        debug(format('Received request: %s', req.url))

        toRoutingKey(req, function(err, routingKey) {

            broker.publish(publication, { headers: req.headers, body: req.body }, routingKey, function(err, messageId) {
                if (err) return next(err)
                res.status(202).json({ txid: messageId })
            })
        })
    }
}