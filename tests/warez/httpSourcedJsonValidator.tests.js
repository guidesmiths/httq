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

    before(function(done) {
        var app = express()
        app.use(bodyParser.json())
        app.post('/', function(req, res, next) {
            middleware(req, res, function(err) {
                err ? res.status(500).json({ error: err.message }) : res.status(204).end()
            })
        })
        app.get('/schemas/simple', function(req, res) {
            res.status(200).send(JSON.stringify({
                "$schema": "http://json-schema.org/schema#",
                "type":"object",
                "properties":{
                    "id": {
                        "type": "number"
                    },
                    "type": {
                        "$ref": "#/definitions/type"
                    }
                },
                "required" : ["id", "type"],
                "definitions": {
                   "type": "number"
                }
            }))
        })
        app.get('/schemas/complex', function(req, res) {
            res.status(200).send(JSON.stringify({
                "$schema": "http://json-schema.org/schema#",
                "type": "array",
                "items": {"$ref": "/schemas/simple" }
            }))
        })
        app.get('/schemas/complex-missing-ref', function(req, res) {
            res.status(200).send(JSON.stringify({
                "$schema": "http://json-schema.org/schema#",
                "type": "array",
                "items": {"$ref": "/schemas/missing" }
            }))
        })
        server = app.listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should respond with 500 when the primary schema is not specified', function(done) {
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

    it('should fail to initialise when the primary schema cannot be downloaded', function(done) {
        httpSourcedJsonValidator({}, {
            message: {
                schema: 'http://localhost:3000/schemas/missing'
            }
        }, function(err, _middleware) {
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

    it('should fail to initialise when the primary schema url is invalid', function(done) {
        httpSourcedJsonValidator({}, {
            message: {
                schema: 'invalid'
            }
        }, function(err, _middleware) {
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

    it('should fail to initialise when a referenced schema cannot be downloaded', function(done) {
        httpSourcedJsonValidator({}, {
            message: {
                schema: 'http://localhost:3000/schemas/complex-missing-ref'
            }
        }, function(err, _middleware) {
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

    it('should pass successful messages', function(done) {

        var ctx = {
            message: {
                schema: 'http://localhost:3000/schemas/simple',
                content: {
                    body: {
                        id: 1,
                        type: 'book'
                    }
                }
            }
        }

        httpSourcedJsonValidator({}, ctx, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                done()
            })
        })
    })

    it('should pass successful messages with complex schemas', function(done) {

        var ctx = {
            message: {
                schema: 'http://localhost:3000/schemas/complex',
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

        httpSourcedJsonValidator({}, ctx, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                done()
            })
        })
    })

    it('should reject invalid messages', function(done) {

        var ctx = {
            message: {
                schema: 'http://localhost:3000/schemas/simple',
                content: {
                    body: {
                        id: 'a',
                        type: 'book'
                    }
                }
            }
        }

        httpSourcedJsonValidator({}, ctx, function(err, _middleware) {
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