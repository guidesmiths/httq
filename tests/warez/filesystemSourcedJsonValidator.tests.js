var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var request = require('request')
var express = require('express')
var bodyParser = require('body-parser')
var filesystemSourcedJsonValidator = require('../..').warez.filesystemSourcedJsonValidator

describe.only('filesystemSourcedJsonValidator', function() {

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
        server = app.listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should error when the primary schema is not specified', function(done) {
        filesystemSourcedJsonValidator({}, {}, function(err, _middleware) {
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

    it('should error when the primary schema cannot be read', function(done) {
        httq = {
            message: {
                schema: './tests/schemas/missing'
            }
        }
        filesystemSourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/', json: true, method: 'POST'}, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 500)
                assert.equal(body.error, 'Error reading schema from: ./tests/schemas/missing. Original error was: ENOENT, open \'./tests/schemas/missing\'')
                done()
            })
        })
    })

    it('should error when a referenced schema cannot be read', function(done) {
        httq = {
            message: {
                schema: './tests/schemas/complex-missing-ref.json'
            }
        }
        filesystemSourcedJsonValidator({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/', json: true, method: 'POST'}, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 500)
                assert.equal(body.error, 'Error reading schema from: tests/schemas/missing. Original error was: ENOENT, open \'tests/schemas/missing\'')
                done()
            })
        })
    })

    it('should pass successful messages', function(done) {

        httq = {
            message: {
                schema: './tests/schemas/simple.json',
                content: {
                    body: {
                        id: 1,
                        type: 'book'
                    }
                }
            }
        }

        filesystemSourcedJsonValidator({}, {}, function(err, _middleware) {
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
                schema: './tests/schemas/complex.json',
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

        filesystemSourcedJsonValidator({}, {}, function(err, _middleware) {
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
                schema: './tests/schemas/simple.json',
                content: {
                    body: {
                        id: 'a',
                        type: 'book'
                    }
                }
            }
        }

        filesystemSourcedJsonValidator({}, {}, function(err, _middleware) {
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
})