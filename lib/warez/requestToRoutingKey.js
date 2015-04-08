'use strict'

var debug = require('debug')('httq:warez:requestToRoutingKey')
var format = require('util').format
var hogan = require("hogan.js")
var _ = require('lodash')

module.exports = requestToRoutingKey

function requestToRoutingKey(config, ctx, next) {

    var template = hogan.compile(config.template)

    next(null, function(req, res, next) {

        debug(format('Rendering routingKey with template: %s and variables: %s', ctx.template, config.templateVars))

        try {
            ctx.message = ctx.message || {}
            ctx.message.routingKey = template.render(mapMethod(ctx.templateVars))
        } catch (err) {
            return next(err)
        }

        next()
    })

    function mapMethod(templateVars) {
        if (!config.method || !config.method.mapping) return templateVars
        var clone = _.cloneDeep(templateVars)
        clone.request.method = config.method.mapping[clone.request.method] || clone.request.method
        return clone
    }
}