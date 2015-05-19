var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var bodyParser = require('body-parser')
var httpSourcedJsonValidator = require('../..').warez.httpSourcedJsonValidator

describe('httpSourcedJsonValidator', function() {

    var server
    var middleware
    var httq = {}

    before(function(done) {
        var app = express()
        app.use(bodyParser.json())
        app.post('/', function(req, res, next) {
            req.httq = httq
            middleware(req, res, function(err) {
                err ? res.status(500).json({ error: err.message }) : res.status(204).end()
            })
        })
        app.use('/schemas', express.static('tests/schemas'))
        server = app.listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should error when the primary schema is not specified', function(done) {
        httpSourcedJsonValidator({}, {}, function(err, _middleware) {
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

    it('should error when the primary schema cannot be downloaded', function(done) {
        httq = {
            message: {
                schema: 'http://localhost:3000/schemas/missing'
            }
        }
        httpSourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/', json: true, method: 'POST'}, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 500)
                assert.equal(body.error, 'Schema download from: http://localhost:3000/schemas/missing failed with status: 404')
                done()
            })
        })
    })

    it('should error when the primary schema url is invalid', function(done) {
        httq = {
            message: {
                schema: 'invalid'
            }
        }
        httpSourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/', json: true, method: 'POST'}, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 500)
                assert.equal(body.error, 'Error requesting schema from: invalid. Original error was: Invalid URI "invalid"')
                done()
            })
        })
    })

    it('should error when a referenced schema cannot be downloaded', function(done) {
        httq = {
            message: {
                schema: 'http://localhost:3000/schemas/complex-missing-ref.json'
            }
        }
        httpSourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/', json: true, method: 'POST'}, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 500)
                assert.equal(body.error, 'Schema download from: http://localhost:3000/schemas/missing failed with status: 404')
                done()
            })
        })
    })

    it('should pass explicitly excluded messages', function(done) {

        httq = {
            message: {
                schema: 'http://localhost:3000/schemas/ignore-me-please.json',
                content: {
                    body: {
                        id: 1,
                        type: 'book'
                    }
                }
            }
        }

        httpSourcedJsonValidator({ excludes: ['ignore-me-please.json'] }, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                done()
            })
        })
    })

    it('should pass implicitly excluded messages', function(done) {

        httq = {
            message: {
                schema: 'http://localhost:3000/schemas/ignore-me-please.json',
                content: {
                    body: {
                        id: 1,
                        type: 'book'
                    }
                }
            }
        }

        httpSourcedJsonValidator({ includes: ['other-schema.json'] }, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                done()
            })
        })
    })

    it('should pass successful messages', function(done) {

        httq = {
            message: {
                schema: 'http://localhost:3000/schemas/simple.json',
            }
        }

        httpSourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: { id: 1, type: 'book' } }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                done()
            })
        })
    })

    it('should pass successful messages with complex schemas', function(done) {

        httq = {
            message: {
                schema: 'http://localhost:3000/schemas/complex.json'
            }
        }

        httpSourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: [
                {
                    id: 1,
                    type: 'book'
                },
                {
                    id: 2,
                    type: 'journal'
                }
            ] }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                done()
            })
        })
    })

    it('should reject invalid messages', function(done) {

        httq = {
            message: {
                schema: 'http://localhost:3000/schemas/simple.json'
            }
        }

        httpSourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: {
                id: 'a',
                type: 'book'
            } }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 400)
                assert.equal(body.length, 1)
                assert.equal(body[0].message, 'Invalid type: string (expected number)')
                done()
            })
        })
    })
})