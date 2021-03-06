var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var requestToRoutingKey = require('../..').warez.requestToRoutingKey

describe('requestToRoutingKey', function() {

    var server
    var middleware
    var httq = {}

    before(function(done) {
        var app = express()
        server = app.get('/', function(req, res, next) {
            req.httq = httq
            middleware(req, res, function(err) {
                err ? res.status(500).end() : res.status(204).end()
            })
        }).listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should construct a routing key from the template vars', function(done) {

        var config = {
            template: '{{request.headers.foo}}.{{request.params.bar}}.{{request.query.baz}}.{{request.method}}'
        }

        httq = {
            templateVars: {
                request: {
                    method: 'GET',
                    headers: {
                        foo: 1
                    },
                    params: {
                        bar: 2
                    },
                    query: {
                        baz: 3
                    }
                }
            }
        }

        requestToRoutingKey(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000'}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(httq.message.routingKey, '1.2.3.GET')
                done()
            })
        })
    })

    it('should map the method', function(done) {

        var config = {
            template: '{{request.headers.foo}}.{{request.params.bar}}.{{request.query.baz}}.{{request.method}}',
            method: {
                mapping: {
                    'GET': 'requested'
                }
            }
        }

        httq = {
            templateVars: {
                request: {
                    method: 'GET',
                    headers: {
                        foo: 1
                    },
                    params: {
                        bar: 2
                    },
                    query: {
                        baz: 3
                    }
                }
            }
        }

        requestToRoutingKey(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000'}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(httq.message.routingKey, '1.2.3.requested')
                done()
            })
        })
    })
})