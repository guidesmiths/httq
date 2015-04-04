'use strict'

var requestToken = require('request-token')

module.exports = function(config) {
    return requestToken(config).generate
}