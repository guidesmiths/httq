var debug = require('debug')('httq:index')
var format = require('util').format
var _ = require('lodash')
var async = require('async')
var url = require('url')
var warez = require('./lib/warez')

module.exports = {
    init: init,
    warez: warez
}

function init(broker, config, ctx, next) {
    if (arguments.length === 3) return init(broker, config, {}, arguments[2])
    ctx.broker = broker,
    ctx.warez = _.defaults(ctx.warez || {}, warez)

    async.mapSeries(config.sequence, function(id, callback) {
        var warezConfig = config.warez[id]
        ctx.warez[warezConfig.type](warezConfig.options || {}, ctx, callback)
    }, next)
}