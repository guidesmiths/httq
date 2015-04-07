var debug = require('debug')('httq:index')
var format = require('util').format
var _ = require('lodash')
var async = require('async')

module.exports = httq

function httq(config, warez, next) {

    async.mapSeries(config.sequence, function(id, callback) {
        var warezConfig = config.warez[id]
        warez[warezConfig.type](warezConfig.options, callback)
    }, next)

}