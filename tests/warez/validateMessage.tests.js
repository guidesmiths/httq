var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var bodyParser = require('body-parser')
var validateMessage = require('../..').warez.validateMessage

describe('validateMessage', function() {

    var server
    var middleware

    before(function(done) {
        var app = express()
        app.use(bodyParser.json())
        app.post('/', function(req, res, next) {
            middleware(req, res, function(err) {
                err ? res.status(500).end() : res.status(204).end()
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

    it('should fail to initialise when the primary schema is not specified', function(done) {
        validateMessage({}, {}, function(err, _middleware) {
            assert.ok(err)
            assert.equal('A schema url is required', err.message)
            done()
        })
    })

    it('should fail to initialise when the primary schema cannot be downloaded', function(done) {
        validateMessage({
            schema: {
                url: 'http://localhost:3000/schemas/missing'
            }
        }, {}, function(err, _middleware) {
            assert.ok(err)
            assert.equal('Failed to download schema from: http://localhost:3000/schemas/missing', err.message)
            done()
        })
    })

    it('should fail to initialise when the primary schema url is invalid', function(done) {
        validateMessage({
            schema: {
                url: 'invalid'
            }
        }, {}, function(err, _middleware) {
            assert.ok(err)
            assert.equal('Invalid URI \"invalid\"', err.message)
            done()
        })
    })

    it('should fail to initialise when a referenced schema cannot be downloaded', function(done) {
        validateMessage({
            schema: {
                url: 'http://localhost:3000/schemas/complex-missing-ref'
            }
        }, {}, function(err) {
            assert.ok(err)
            assert.equal('Failed to download schema from: http://localhost:3000/schemas/missing', err.message)
            done()
        })
    })

    it('should pass successful messages', function(done) {

        var ctx = {
            message: {
                content: { id: 1, type: 'book' }
            }
        }

        validateMessage({
            schema: {
                url: 'http://localhost:3000/schemas/simple'
            }
        }, ctx, function(err, _middleware) {
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
                content: [
                    { id: 1, type: 'book' },
                    { id: 2, type: 'journal' }
                ]
            }
        }

        validateMessage({
            schema: {
                url: 'http://localhost:3000/schemas/complex'
            }
        }, ctx, function(err, _middleware) {
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
                content: { invalid: 1 }
            }
        }

        validateMessage({
            schema: {
                url: 'http://localhost:3000/schemas/simple'
            }
        }, ctx, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 400)
                assert.equal(body.length, 2)
                assert.equal(body[0].message, 'Missing required property: id')
                assert.equal(body[1].message, 'Missing required property: type')
                done()
            })
        })
    })

    it('should set primary schema url in httq header', function(done) {
        var ctx = {
            message: {
                content: { id: 1, type: 'book' }
            }
        }

        validateMessage({
            schema: {
                url: 'http://localhost:3000/schemas/simple'
            }
        }, ctx, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', json: true }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(ctx.message.headers.httq.schema.url, 'http://localhost:3000/schemas/simple')
                done()
            })
        })
    })
})