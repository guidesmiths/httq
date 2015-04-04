var toRoutingKey = require('../utils/toRoutingKey')

module.exports = function(broker, publication) {
    return function fireAndForget(req, res, next) {
        var messageContent = {
          headers: req.headers,
          body: req.body,
          params: req.params,
          query: req.query
        }
        broker.publish(publication, messageContent, toRoutingKey(req.path), function(err, messageId) {
            if (err) return next(err)
            res.status(202).json({ txid: messageId })
        })
    }
}
