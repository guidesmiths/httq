'use strict'

var debug = require('debug')('httq:warez:sourcedJsonValidator')
var format = require('util').format
var tv4 = require('tv4')
var tv4formats = require('tv4-formats')
var _ = require('lodash')
var async = require('async')
var url = require('url')

module.exports = sourcedJsonValidator

function sourcedJsonValidator(fetchJsonSchema, config, ctx, next) {

    var validator = ctx.tv4 || getValidator()

    next(null, function(req, res, next) {

        var schemaUrl = req.httq.message && req.httq.message.schema

        async.waterfall([
            ensureSchemas,
            validate
        ], function(err, isValid, validationErrors) {
            if (err) return next(err)
            if (isValid) return next()
            res.status(400).json(validationErrors)
        })

        function ensureSchemas(next) {

            if (!schemaUrl) return next(new Error(format('No schema defined for %s', req.url)))
            if (excluded(schemaUrl)) return next()
            if (!included(schemaUrl)) return next()

            async.series([
                ensurePrimarySchema,
                ensureReferencedSchemas
            ], function(err) {
                next(err)
            })

            function ensurePrimarySchema(cb) {
                if (validator.getSchema(schemaUrl)) return cb()
                addSchema(schemaUrl, cb)
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
                    if (err) return cb(err)
                    debug(format('Caching schema with key: %s', url))
                    validator.addSchema(url, schema)
                    cb()
                })
            }
        }

        function excluded() {
            if (!config.excludes) return false
            var path = url.parse(schemaUrl).pathname
            return _.find(config.excludes, function(exclude) {
                return _.endsWith(path, exclude)
            })
        }

        function included() {
            if (!config.includes) return true
            var path = url.parse(schemaUrl).pathname
            return _.find(config.includes, function(include) {
                return _.endsWith(path, include)
            })
        }

        function validate(next) {
            debug(format('Validating message from request: %s against: %s', req.url, schemaUrl))

            var schema = validator.getSchema(schemaUrl) || {}
            var result = validator.validateMultiple(req.body, schema);
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