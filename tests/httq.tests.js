var format = require('util').format
var assert = require('assert')
var rascal = require('rascal')
var request = require('request')
var express = require('express')
var bodyParser = require('body-parser')
var async = require('async')
var definitions = require('./definitions.json')

var httq = require('..')

describe('httq', function() {

    var broker
    var server


    beforeEach(function(done) {
        var config = rascal.withTestConfig(definitions)

        async.series([
            function(cb) {
                rascal.createBroker(config, function(err, _broker) {
                    if (err) return cb(err)
                    broker = _broker
                    cb()
                })
            },
            function(cb) {
                var app = express();
                app.use(bodyParser.json())
                app.get('/api/library/v1/books', httq.middleware.fireAndForget(broker, 'p1', httq.transformers.pathToRoutingKey()))
                app.get('/api/library/v2/books', httq.middleware.fireAndForget(broker, 'p1', httq.transformers.pathToRoutingKey({
                    method: true,
                    alt: {
                        GET: 'requested',
                        POST: 'created',
                        PUT: 'amended',
                        DELETE: 'deleted'
                    }
                })))
                app.post('/api/library/v3/books', httq.middleware.fireAndForget(broker, 'p1', httq.transformers.requestToRoutingKey({
                    pattern: '/api/:system/:version/:entity',
                    template: '{{params.system}}.{{params.version}}.{{params.entity}}.{{method_alt}}',
                    alt: {
                        GET: 'requested',
                        POST: 'created',
                        PUT: 'amended',
                        DELETE: 'deleted'
                    }
                })))
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

        it('should publish a message with the correct metadata for path based routing key', function(done) {
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


        it('should optionally include HTTP vers in path based routing key', function(done) {
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

        it('should publish a message with the correct metadata for request based routing key', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v3/books', json:true }, function(err, response, body) {
                assert.ifError(err)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(message)
                    assert.equal(message.fields.routingKey, 'library.v3.books.created')
                    assert.equal(message.properties.messageId, body.txid)
                    assert.equal(message.properties.contentType, 'application/json')
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

    })
})