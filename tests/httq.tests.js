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
                rascal.createBroker(rascal.withTestConfig(config.rascal), function(err, _broker) {
                    if (err) return cb(err)
                    broker = _broker
                    cb(null, broker)
                })
            },
            function(broker, cb) {
                httq.init(broker, config.httq.routes.book_loan, cb)
            },
            function(httq, cb) {
                app = express();
                app.use(bodyParser.json())
                app.post(config.httq.routes.book_loan.pattern, httq)
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
            request.post({ url: 'http://localhost:3000/api/library/v1/books/978-3-16-148410-0/loans', json:{} }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)
                assert.equal(response.headers['content-type'], 'application/json; charset=utf-8')
                assert.ok(body.txid)
                assert.ok(/\w+-\w+-\w+-\w+-\w+/.test(body.txid), format('txid: %s is not in the expected format', body.txid))
                done()
            })
        })

        it('should publish a message with the correct metadata', function(done) {
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

        it('should publish a message with the correct data', function(done) {
            request.post({ url: 'http://localhost:3000/api/library/v1/books/978-3-16-148410-0/loans', qs: { foo: 1 }, headers: { bar: 2 }, json: { baz: 3 } }, function(err, response, body) {
                assert.ifError(err)
                assert.equal(response.statusCode, 202)

                var consumerTag
                broker.subscribe('s1', function(err, message, content, next) {
                    assert.ifError(err)
                    broker.unsubscribe('s1', consumerTag)
                    assert.ok(content)
                    assert.equal(content.url.pathname, '/api/library/v1/books/978-3-16-148410-0/loans')
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
    })
})