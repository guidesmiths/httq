'use strict'

var debug = require('debug')('httq:warez:sourcedJsonValidator')
var format = require('util').format
var tv4 = require('tv4')
var tv4formats = require('tv4-formats')
var _ = require('lodash')
var async = require('async')

module.exports = sourcedJsonValidator

function sourcedJsonValidator(fetchJsonSchema, config, ctx, next) {

    var validator = ctx.tv4 || getValidator()

    next(null, function(req, res, next) {

        ctx.message = ctx.message || {}

        async.waterfall([
            ensureSchemas,
            validate
        ], function(err, isValid, validationErrors) {
            if (err) return next(err)
            if (isValid) return next()
            res.status(400).send(JSON.stringify(validationErrors))
        })

        function ensureSchemas(next) {

            if (!ctx.message.schema) return next(new Error(format('No schema defined for %s', req.url)))

            var schemaUrl = ctx.message.schema

            async.series([
                ensurePrimarySchema,
                ensureReferencedSchemas
            ], function(err) {
                next(err, schemaUrl)
            })

            function ensurePrimarySchema(cb) {
                if (validator.getSchema(schemaUrl)) return cb()
                addSchema.bind(null, schemaUrl)
                cb()
            }

            function ensureReferencedSchemas(cb) {
                async.whilst(missingSchemas, addSchemas, cb)
            }

            function missingSchemas() {
                return validator.getMissingUris().length > 0
            }

            function addSchemas(cb) {
                async.each(validator.getMissingUris(), addSchema, cb)
            }

            function addSchema(url, cb) {
                fetchJsonSchema(url, function(err, schema) {
                    if (err) return next(err)
                    validator.addSchema(url, schema)
                    cb()
                })
            }
        }

        function validate(schemaUrl, next) {
            debug(format('Validating message from request: %s against: %s', req.url, schemaUrl))

            var schema = validator.getSchema(schemaUrl)
            var result = validator.validateMultiple(ctx.message.content.body, schema);
            next(null, result.valid, _.map(result.errors, toApiError))

            function toApiError(error) {
                return _.omit(error, 'stack')
            }
        }
    })

    function getValidator() {
        var validator = tv4.freshApi()
        validator.addFormat(tv4formats)
        return validator
    }
}