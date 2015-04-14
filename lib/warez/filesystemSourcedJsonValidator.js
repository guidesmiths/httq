'use strict'

var debug = require('debug')('httq:warez:filesystemSourcedJsonValidator')
var format = require('util').format
var safeParse = require("safe-json-parse/callback")

var fs = require('fs')
var sourcedJsonValidator = require('./sourcedJsonValidator')

module.exports = filesystemSourcedJsonValidator

function filesystemSourcedJsonValidator(config, ctx, next) {

    return sourcedJsonValidator(requestJsonSchema, config, ctx, next)

    function requestJsonSchema(url, next) {
        debug(format('Requesting schema from: %s', url))
        fs.readFile(url, { encoding: 'utf8' }, function(err, content) {
            if (err) return next(new Error(format('Error reading schema from: %s. Original error was: %s', url, err.message)))
            safeParse(content, next)
        })
    }
}