var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var request = require('request')
var express = require('express')
var bodyParser = require('body-parser')
var filesystemSourcedJsonValidator = require('../..').warez.filesystemSourcedJsonValidator

describe('filesystemSourcedJsonValidator', function() {

    var server
    var middleware

    before(function(done) {
        var app = express()
        app.use(bodyParser.json())
        app.post('/', function(req, res, next) {
            middleware(req, res, function(err) {
                err ? res.status(500).json({ error: err.message }) : res.status(204).end()
            })
        })
        server = app.listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should respond with 500 when the primary schema is not specified', function(done) {
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

    it('should respond with 500 when the primary schema cannot be read', function(done) {
        filesystemSourcedJsonValidator({}, {
            message: {
                schema: './tests/schemas/missing'
            }
        }, function(err, _middleware) {
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

    it('should respond with 500 when a referenced schema cannot be read', function(done) {
        filesystemSourcedJsonValidator({}, {
            message: {
                schema: './tests/schemas/complex-missing-ref.json'
            }
        }, function(err, _middleware) {
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

        var ctx = {
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

        filesystemSourcedJsonValidator({}, ctx, function(err, _middleware) {
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

        var ctx = {
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

        filesystemSourcedJsonValidator({}, ctx, function(err, _middleware) {
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

        var ctx = {
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

        filesystemSourcedJsonValidator({}, ctx, function(err, _middleware) {
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