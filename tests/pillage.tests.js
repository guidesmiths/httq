var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var pillage = require('..').warez.pillage

describe('Pillage', function() {

    var server
    var middleware

    before(function(done) {
        var app = express()
        server = app.get('/:foo/:bar/:baz/', function(req, res, next) {
            middleware(req, res, function(err) {
                err ? res.status(500).end() : res.status(204).end()
            })
        }).listen(3000, done)
    })

    after(function(done) {
        server.close(done)
    })

    it('should extract data from the request', function(done) {
        var ctx = {}
        pillage({}, ctx, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/a/b/c', headers: { 'foo': '1' }, qs: { bar: 2 }}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(ctx.method, 'GET')
                assert.equal(ctx.headers['foo'], '1')
                assert.equal(ctx.query['bar'], '2')
                done()
            })
        })
    })
})