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

    before(function(done) {
        var app = express()
        app.use(bodyParser.json())
        server = app.post('/', function(req, res, next) {
            middleware(req, res, function(err) {
                err ? res.status(500).end() : res.status(204).end()
            })
        }).listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should construct a message from the request', function(done) {

        var ctx = {}
        requestToMessage({}, ctx, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000', qs: { foo: 1 }, headers: { 'bar': 2 }, json: { baz: 3 } }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.ok(ctx.message.headers)
                assert.equal(ctx.message.headers.request.method, 'POST')
                assert.equal(ctx.message.headers.request.url, '/?foo=1')
                assert.equal(ctx.message.headers.request.query.foo, 1)
                assert.equal(ctx.message.headers.request.headers.bar, 2)
                assert.ok(ctx.message.content.baz, 3)
                done()
            })
        })
    })
})