var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var requestPathToRoutingKey = require('../..').warez.requestPathToRoutingKey

describe('requestPathToRoutingKey', function() {

    var server
    var middleware
    var httq = {}

    before(function(done) {
        var app = express()
        server = app.get('/:foo/:bar/:baz', function(req, res, next) {
            req.httq = httq
            middleware(req, res, function(err) {
                err ? res.status(500).end() : res.status(204).end()
            })
        }).listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should construct a routing key from the path', function(done) {

        requestPathToRoutingKey({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/1/2/3'}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(httq.message.routingKey, '1.2.3')
                done()
            })
        })
    })

    it('should prefix method in the routing key', function(done) {

        var config = {
            method: {
                prefix: true
            }
        }

        requestPathToRoutingKey(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/1/2/3'}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(httq.message.routingKey, 'GET.1.2.3')
                done()
            })
        })
    })

    it('should suffix method in the routing key', function(done) {

        var config = {
            method: {
                suffix: true
            }
        }

        requestPathToRoutingKey(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/1/2/3'}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(httq.message.routingKey, '1.2.3.GET')
                done()
            })
        })
    })

    it('should translate method in the routing key', function(done) {

        var config = {
            method: {
                suffix: true,
                mapping: {
                    'GET': 'requested'
                }
            }
        }

        requestPathToRoutingKey(config, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/1/2/3'}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(httq.message.routingKey, '1.2.3.requested')
                done()
            })
        })
    })
})