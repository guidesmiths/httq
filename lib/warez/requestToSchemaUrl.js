'use strict'

var debug = require('debug')('httq:warez:requestToSchemaUrl')
var format = require('util').format
var template = require("../util/template")
var _ = require('lodash')

module.exports = requestToSchemaUrl

function requestToSchemaUrl(config, ctx, next) {

    template.compile(config.template, function(err, render) {
        next(err, function(req, res, next) {
            debug(format('Rendering schema url with template: %s and variables: %s', ctx.template, config.templateVars))
            render(mapMethod(ctx.templateVars), function(err, schemaUrl) {
                if (err) return next(err)
                ctx.message = ctx.message || {}
                ctx.message.schema = schemaUrl
                next()
            })
        })
    })

    function mapMethod(templateVars) {
        if (!config.method || !config.method.mapping) return templateVars
        var clone = _.cloneDeep(templateVars)
        clone.request.method = config.method.mapping[clone.request.method] || clone.request.method
        return clone
    }
}