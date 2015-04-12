var format = require('util').format
var assert = require('assert')
var rascal = require('rascal')
var request = require('request')
var express = require('express')
var bodyParser = require('body-parser')
var async = require('async')
var config = require('./httq.tests.json')
var httq = require('..')

describe('httq', function() {

    var broker
    var server
    var app

    beforeEach(function(done) {
        async.waterfall([
            function(cb) {
                app = express();
                app.use(bodyParser.json())
                app.use('/schemas', express.static('tests/schemas'))
                server = app.listen(3000, cb)
            },
            function(cb) {
                rascal.createBroker(rascal.withTestConfig(config.rascal), function(err, _broker) {
                    if (err) return cb(err)
                    broker = _broker
                    cb(null, broker)
                })
            },
            function(broker, cb) {
                async.series({
                    route1: httq.init.bind(null, broker, config.httq.routes.book_loan_v1),
                    route2: httq.init.bind(null, broker, config.httq.routes.book_loan_v2),
                    route3: httq.init.bind(null, broker, config.httq.routes.book_loan_v3)
                }, cb)
            },
            function(httq, cb) {
                app.post(config.httq.routes.book_loan_v1.pattern, httq.route1)
                app.post(config.httq.routes.book_loan_v2.pattern, httq.route2)
                app.post(config.httq.routes.book_loan_v3.pattern, httq.route3)
                cb()
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
            request.post({ url: 'http://localhost:3000/api/library/v1/books/978-3-16-148410-0/loans', json: {} }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)
                assert.equal(response.headers['content-type'], 'application/json; charset=utf-8')
                assert.ok(body.txid)
                assert.ok(/\w+-\w+-\w+-\w+-\w+/.test(body.txid), format('txid: %s is not in the expected format', body.txid))
                done()
            })
        })

        it('should publish a message with the correct metadata using the requestPathToRoutingKey transformer', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v1/books/978-3-16-148410-0/loans', json:{} }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(message)
                    assert.equal(message.fields.routingKey, 'api.library.v1.books.978-3-16-148410-0.loans.created')
                    assert.equal(message.properties.messageId, body.txid)
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should publish a message generated by the requestToMessageContent transformer', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v1/books/978-3-16-148410-0/loans', qs: { foo: 1 }, headers: { bar: 2 }, json: { baz: 3 } }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(content)
                    assert.equal(content.url, '/api/library/v1/books/978-3-16-148410-0/loans?foo=1')
                    assert.equal(content.query.foo, 1)
                    assert.equal(content.headers.bar, 2)
                    assert.equal(content.body.baz, 3)
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should publish a message with the correct metadata using the requestToRoutingKey transformer', function(done) {
            request.post({ url: 'http://guest:secret@localhost:3000/api/library/v2/books/978-3-16-148410-0/loans', json: {}, qs: { foo: 1 }, headers: { bar: 2 } }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(message)
                    assert.equal(message.fields.routingKey, 'library.v2.books.loans.POST')
                    assert.equal(message.properties.messageId, body.txid)
                    assert.equal(message.properties.headers.httq.url, '/api/library/v2/books/978-3-16-148410-0/loans?foo=1')
                    assert.equal(message.properties.headers.httq.query.foo, 1)
                    assert.equal(message.properties.headers.httq.headers.bar, 2)
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })

        it('should publish a message generated by the requestToMessage transformer', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v2/books/978-3-16-148410-0/loans', json: { foo: 1 } }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(content)
                    assert.equal(content.foo, 1)
                    done()
                }, function(err, result) {
                    assert.ifError(err)
                    consumerTag = result.consumerTag
                })
            })
        })


        it('should valid messages', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v3/books/978-3-16-148410-0/loans', json: { id: 1, type: 'book' } }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)
                done()
            })
        })

        it('should return a 400 when message is invalid', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v3/books/978-3-16-148410-0/loans', json: { foo: 1 } }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 400)
                done()
            })
        })
    })
})