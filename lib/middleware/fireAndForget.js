var toRoutingKey = require('../utils/toRoutingKey')

module.exports = function(broker, publication) {
    return function fireAndForget(req, res, next) {
        broker.publish(publication, { headers: req.headers, body: req.body }, toRoutingKey(req.path), function(err, messageId) {
            if (err) return next(err)
            res.status(202).json({ txid: messageId })
        })
    }
}