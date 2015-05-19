var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var bodyParser = require('body-parser')
var s3SourcedJsonValidator = require('../..').warez.s3SourcedJsonValidator

describe('s3SourcedJsonValidator', function() {

    this.timeout(60000)
    this.slow(10000)

    var server
    var middleware
    var httq = {}
    var config = {
        s3: {
            bucket: 'httq-tests',
            region: 'eu-west-1'
        }
    }

    before(function(done) {
        var app = express()
        app.use(bodyParser.json())
        app.post('/', function(req, res, next) {
            req.httq = httq
            middleware(req, res, function(err) {
                err ? res.status(500).json({ error: err.message }) : res.status(204).end()
            })
        })
        server = app.listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should fail to initialise when s3 config is not specified', function(done) {
        s3SourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ok(err)
            assert.equal(err.message, 'An S3 region is required')
            done()
        })
    })

    it('should fail to initialise when s3 region is not specified', function(done) {
        s3SourcedJsonValidator({
            s3: {
            }
        }, {}, function(err, _middleware) {
            assert.ok(err)
            assert.equal(err.message, 'An S3 region is required')
            done()
        })
    })

    it('should fail to initialise when s3 bucket is not specified', function(done) {
        s3SourcedJsonValidator({
            s3: {
                region: 'eu-west-1'
            }
        }, {}, function(err, _middleware) {
            assert.ok(err)
            assert.equal(err.message, 'An S3 bucket is required')
            done()
        })
    })

    it('should respond with 500 when the primary schema is not specified', function(done) {
        s3SourcedJsonValidator(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/', json: true, method: 'POST'}, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 500)
                assert.equal(body.error, 'No schema defined for /')
                done()
            })
        })
    })

    it('should respond with 500 when the primary schema cannot be downloaded', function(done) {
        httq = {
            message: {
                schema: '/schemas/missing'
            }
        }
        s3SourcedJsonValidator(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/', json: true, method: 'POST'}, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 500)
                assert.equal(body.error, 'Error requesting schema: /schemas/missing. Original error was: The specified key does not exist.')
                done()
            })
        })
    })

    it('should respond with 500 when a referenced schema cannot be downloaded', function(done) {
        httq = {
            message: {
                schema: '/schemas/complex-missing-ref.json'
            }
        }
        s3SourcedJsonValidator(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/', json: true, method: 'POST'}, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 500)
                assert.equal(body.error, 'Error requesting schema: /schemas/missing. Original error was: The specified key does not exist.')
                done()
            })
        })
    })

    it('should pass successful messages', function(done) {

        httq = {
            message: {
                schema: '/schemas/simple.json',
                content: {
                    body: {
                        id: 1,
                        type: 'book'
                    }
                }
            }
        }

        s3SourcedJsonValidator(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                done()
            })
        })
    })

    it('should pass successful messages with complex schemas', function(done) {

        httq = {
            message: {
                schema: '/schemas/complex.json',
                content: {
                    body: [
                        {
                            id: 1,
                            type: 'book'
                        },
                        {
                            id: 2,
                            type: 'journal'
                        }
                    ]
                }
            }
        }

        s3SourcedJsonValidator(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                done()
            })
        })
    })

    it('should reject invalid messages', function(done) {

        httq = {
            message: {
                schema: '/schemas/simple.json',
                content: {
                    body: {
                        id: 'a',
                        type: 'book'
                    }
                }
            }
        }

        s3SourcedJsonValidator(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 400)
                assert.equal(body.length, 1)
                assert.equal(body[0].message, 'Invalid type: string (expected number)')
                done()
            })
        })
    })

    it('should cache schemas', function(done) {

        httq = {
            message: {
                schema: '/schemas/simple.json',
                content: {
                    body: {
                        id: 1,
                        type: 'book'
                    }
                }
            }
        }

        s3SourcedJsonValidator(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            var first = {}
            var second = {}

            var post = _.curry(function(timing, cb) {
                timing.start = new Date().getTime()
                request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, body) {
                    timing.duration = new Date().getTime() - timing.start
                    cb(err)
                })
            })

            async.series([
                post(first),
                post(second)
            ], function(err) {
                assert.ifError(err)
                assert.ok(first.duration > second.duration)
                done()
            })

        })
    })
})