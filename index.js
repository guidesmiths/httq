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

function init(config, warez, ctx, next) {
    if (arguments.length === 3) return init(config, warez, {}, arguments[2])
    async.mapSeries(config.sequence, function(id, callback) {
        var warezConfig = config.warez[id]
        warez[warezConfig.type](warezConfig.options || {}, ctx, callback)
    }, next)
}