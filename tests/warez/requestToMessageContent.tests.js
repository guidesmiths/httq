var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var bodyParser = require('body-parser')
var requestToMessageContent = require('../..').warez.requestToMessageContent

describe('requestToMessageContent', function() {

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

        requestToMessageContent({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({method: 'POST', url: 'http://localhost:3000?foo=1', headers: { 'bar': 2 }, json: { baz: 3 } }, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.ok(httq.message.content.headers)
                assert.equal(httq.message.content.headers.bar, 2)
                assert.ok(httq.message.content.body)
                assert.equal(httq.message.content.body.baz, 3)
                done()
            })
        })
    })
})