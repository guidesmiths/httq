var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var bodyParser = require('body-parser')
var requestToMessage = require('../..').warez.requestToMessage

describe('requestToMessage', function() {

    var server
    var middleware
    var httq = {}

    before(function(done) {
        var app = express()
        app.use(bodyParser.json())
        server = app.post('/', function(req, res, next) {
            req.httq = httq
            middleware(req, res, function(err) {
                err ? res.status(500).end() : res.status(204).end()
            })
        }).listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should construct a message from the request', function(done) {

        requestToMessage({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', qs: { foo: 1 }, headers: { 'bar': 2 }, json: { baz: 3 } }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.ok(httq.message.headers)
                assert.equal(httq.message.headers.httq.method, 'POST')
                assert.equal(httq.message.headers.httq.url, '/?foo=1')
                assert.equal(httq.message.headers.httq.query.foo, 1)
                assert.equal(httq.message.headers.httq.headers.bar, 2)
                assert.ok(httq.message.content.baz, 3)
                done()
            })
        })
    })
})