'use strict'

var debug = require('debug')('httq:warez:httpSourcedJsonValidator')
var format = require('util').format

var request = require('request')
var sourcedJsonValidator = require('./sourcedJsonValidator')

module.exports = httpSourcedJsonValidator

function httpSourcedJsonValidator(config, ctx, next) {

    return sourcedJsonValidator(requestJsonSchema, config, ctx, next)

    function requestJsonSchema(url, cb) {
        debug(format('Requesting schema from: %s', url))
        request({ url: url, json: true }, function(err, response, schema) {
            if (err) return cb(err)
            if (!/^2/.test(response.statusCode)) return cb(new Error(format('Schema download from: %s failed with status: %s', url, response.statusCode)))
            cb(null, schema)
        })
    }
}