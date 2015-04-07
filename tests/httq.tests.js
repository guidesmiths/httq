var format = require('util').format
var assert = require('assert')
var rascal = require('rascal')
var request = require('request')
var express = require('express')
var bodyParser = require('body-parser')
var async = require('async')
var config = require('./config.json')
var httq = require('..')

describe.skip('httq', function() {

    var broker
    var server

    beforeEach(function(done) {
        async.waterfall([
            function(cb) {
                rascal.createBroker(rascal.withTestConfig(config.rascal), function(err, _broker) {
                    if (err) return cb(err)
                    broker = _broker
                    cb(null, broker)
                })
            },
            function(broker, cb) {
                cb(null, httq(broker, config.httq))
            },
            function(httq, cb) {
                var app = express();
                app.use(bodyParser.json())
                app.all('/api/library/v1/books', httq('d1'))
                app.all('/api/library/v2/books', httq('d2'))
                app.all('/api/library/v3/books', httq('d3'))
                app.all('/api/library/v4/books', httq('d4'))
                app.all('/api/library/v5/books', httq('d5'))
                server = app.listen(3000, cb)
            }
        ], done)
    })

    afterEach(function(done) {
        async.series([
            function(cb) {
                broker ? broker.nuke(cb) : cb()
            },
            function(cb) {
                server ? server.close(cb) : cb()
            }
        ], done)
    })

    describe('fire and forget', function() {

        it('should send a "202 Accepted" response', function(done) {
            request.get({ url: 'http://localhost:3000/api/library/v1/books', json:true }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)
                assert.equal(response.headers['content-type'], 'application/json; charset=utf-8')
                assert.ok(body.txid)
                assert.ok(/\w+-\w+-\w+-\w+-\w+/.test(body.txid), format('txid: %s is not in the expected format', body.txid))
                done()
            })
        })

        it('should publish a message with the correct metadata using path to routing key transformer', function(done) {
            request.get({ url: 'http://localhost:3000/api/library/v1/books', json:true }, function(err, response, body) {
                assert.ifError(err)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(message)
                    assert.equal(message.fields.routingKey, 'api.library.v1.books')
                    assert.equal(message.properties.messageId, body.txid)
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should optionally include HTTP verbs using path to routing key transformer', function(done) {
            request.get({ url: 'http://localhost:3000/api/library/v2/books', json:true }, function(err, response, body) {
                assert.ifError(err)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(message)
                    assert.equal(message.fields.routingKey, 'api.library.v2.books.requested')
                    assert.equal(message.properties.messageId, body.txid)
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should publish a message with the correct content using path to routing key transformer', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v2/books', json: { foo: 'bar' }, headers: { 'x-tracer': 'baz' } }, function(err, response, body) {
                assert.ifError(err)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(content)
                    assert.ok(content.headers)
                    assert.ok(content.headers['x-tracer'], 'baz')
                    assert.ok(content.body)
                    assert.equal(content.body.foo, 'bar')
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should publish a message with just the body content using path to routing key transformer', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v3/books', json: { foo: 'bar' }, headers: { 'x-tracer': 'baz' } }, function(err, response, body) {
                assert.ifError(err)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(content)
                    assert.ok(!content.headers)
                    assert.ok(!content.body)
                    assert.equal(content.foo, 'bar')
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should publish a message with the correct metadata using request to routing key transformer', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v4/books', json:true }, function(err, response, body) {
                assert.ifError(err)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(message)
                    assert.equal(message.fields.routingKey, 'library.v4.books.created')
                    assert.equal(message.properties.messageId, body.txid)
                    assert.equal(message.properties.contentType, 'application/json')
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should publish a message with the correct content using request to routing key transformer', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v4/books', json: { foo: 'bar' }, headers: { 'x-tracer': 'baz' } }, function(err, response, body) {
                assert.ifError(err)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(content)
                    assert.ok(content.headers)
                    assert.ok(content.headers['x-tracer'], 'baz')
                    assert.ok(content.body)
                    assert.equal(content.body.foo, 'bar')
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should publish a message with just the body content using request to routing key transformer', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v5/books', json: { foo: 'bar' }, headers: { 'x-tracer': 'baz' } }, function(err, response, body) {
                assert.ifError(err)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(content)
                    assert.ok(!content.headers)
                    assert.ok(!content.body)
                    assert.equal(content.foo, 'bar')
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })
    })
})