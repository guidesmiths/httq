'use strict'

var debug = require('debug')('httq:warez:s3SourcedJsonValidator')
var format = require('util').format
var path = require('path')
var AWS = require('aws-sdk')
var safeParse = require("safe-json-parse/callback")

var sourcedJsonValidator = require('./sourcedJsonValidator')

module.exports = s3SourcedJsonValidator

function s3SourcedJsonValidator(config, ctx, next) {

    if (!config.s3 || !config.s3.region) return next(new Error('An S3 region is required'))
    if (!config.s3 || !config.s3.bucket) return next(new Error('An S3 bucket is required'))

    var s3Client = getS3Client(config.s3.region)
    var bucket = config.s3.bucket

    return sourcedJsonValidator(requestJsonSchema, config, ctx, next)

    function requestJsonSchema(url, cb) {

        debug(format('Requesting schema: %s from bucket: %s', url, bucket ))

        var s3Params = {
            Bucket: bucket + path.dirname(url),
            Key: path.basename(url)
        }

        s3Client.getObject(s3Params, function(err, response) {
            if (err) return cb(new Error(format('Error requesting schema: %s. Original error was: %s', url, err.message)))
            safeParse(response.Body.toString(), cb)
        })
    }

    function getS3Client(region) {
        AWS.config.update({ region: region })
        var s3Client = new AWS.S3()
        return s3Client
    }
}