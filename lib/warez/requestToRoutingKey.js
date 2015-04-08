'use strict'

var debug = require('debug')('httq:warez:requestToRoutingKey')
var format = require('util').format
var hogan = require("hogan.js")

module.exports = requestToRoutingKey

function requestToRoutingKey(config, ctx, next) {

    var template = hogan.compile(config.template)

    next(null, function(req, res, next) {

        debug(format('Rendering routingKey with template: %s and variables: %s', ctx.template, config.templateVars))

        var content
        try {
            ctx.routingKey = template.render(ctx.templateVars)
        } catch (err) {
            return next(err)
        }

        next()
    })
}