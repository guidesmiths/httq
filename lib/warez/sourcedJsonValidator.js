'use strict'

var debug = require('debug')('httq:warez:sourcedJsonValidator')
var format = require('util').format
var tv4 = require('tv4')
var tv4formats = require('tv4-formats')
var _ = require('lodash')
var async = require('async')

module.exports = sourcedJsonValidator

function sourcedJsonValidator(fetchJsonSchema, config, ctx, next) {

    if (!config.schema || !config.schema.url) return next(new Error('A schema url is required'))
    var schemaUrl = config.schema.url

    initialiseValidator(function(err, validate) {
        debug('Finished initialising json validator')
        next(err, function middleware(req, res, next) {
            debug(format('Validating message from request: %s against: %s', req.url, schemaUrl))
            validate(ctx.message.content.body, schemaUrl, function(isValid, errors) {
                isValid ? next() : res.status(400).send(JSON.stringify(errors))
                _.merge(ctx.message || {}, {
                    headers: {
                        httq: {
                            schema: { url: schemaUrl }
                        }
                    }
                })
            })
        })
    })

    function initialiseValidator(next) {

        debug('Initialising json validator')

        var validator = ctx.tv4 || (function() {
            var validator = tv4.freshApi()
            validator.addFormat(tv4formats)
            return validator
        })()

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

        function noop(cb) {
            cb()
        }

        var ensurePrimarySchema = validator.getSchema(schemaUrl) ? noop
                                                                 : addSchema.bind(null, schemaUrl)

        function ensureReferencedSchemas(cb) {
            async.whilst(missingSchemas, addSchemas, cb)
        }

        function toApiError(error) {
            return _.omit(error, 'stack')
        }

        function validate(content, schemaUrl, cb) {
            var schema = validator.getSchema(schemaUrl)
            var result = validator.validateMultiple(content, schema);
            cb(result.valid, _.map(result.errors, toApiError))
        }

        async.series([
            ensurePrimarySchema,
            ensureReferencedSchemas
        ], function(err) {
            next(err, validate)
        })
    }
}