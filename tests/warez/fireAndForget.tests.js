'use strict'

var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var rascal = require('rascal')
var fireAndForget = require('../..').warez.fireAndForget

describe('Pillage', function() {

    var broker
    var server
    var middleware

    before(function(done) {

       var config = {
            "vhosts": {
                "/": {
                    "namespace": true,
                    "exchanges": {
                        "e1": {}
                    },
                    "queues": {
                        "q1": {}
                    },
                    "bindings": {
                        "b1": {
                            "source": "e1",
                            "destination": "q1",
                            "bindingKey": "foo.#"
                        }
                    }
                }
            },
            "publications": {
                "p1": {
                    "exchange": "e1"
                }
            },
            "subscriptions": {
                "s1": {
                    "queue": "q1"
                }
            }
        }

        async.series([
            function(cb) {
                rascal.createBroker(rascal.withTestConfig(config), function(err, _broker) {
                    if (err) return cb(err)
                    broker = _broker
                    cb(null, broker)
                })
            },
            function(cb) {
                var app = express()
                server = app.get('/', function(req, res, next) {
                    middleware(req, res, function(err) {
                        err ? res.status(500).end() : res.status(204).end()
                    })
                }).listen(3000, cb)
            }
        ], done)
    })

    after(function(done) {
        async.series([
            function(next) {
                server ? server.close(next) : next()
            },
            function(next) {
                broker ? broker.nuke(next) : next()
            }
        ], done)
    })

    it('should publish message to th specified publication', function(done) {

        var config = {
            publication: 'p1'
        }

        var ctx = {
            broker: broker,
            routingKey: 'foo.bar',
            payload: {
                foo: 1
            }
        }

        broker.subscribe('s1', function(err, message, content) {
            if (err) return cb(err)
            assert.equal(content.foo, 1)
            done()
        })

        fireAndForget(config, ctx, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000'}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)
            })
        })
    })
})