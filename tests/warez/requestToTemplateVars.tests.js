var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var express = require('express')
var request = require('request')
var requestToTemplateVars = require('../..').warez.requestToTemplateVars

describe('requestToTemplateVars', function() {

    var server
    var middleware
    var httq

    before(function(done) {
        var app = express()
        server = app.get('/:foo/:bar/:baz/', function(req, res, next) {
            middleware(req, res, function(err) {
                httq = req.httq
                err ? res.status(500).end() : res.status(204).end()
            })
        }).listen(3000, done)
    })

    after(function(done) {
        server ? server.close(done) : done()
    })

    it('should extract data from the request', function(done) {
        requestToTemplateVars({}, {}, function(err, _middleware) {
            assert.ifError(err)
            middleware = _middleware
            request({url: 'http://localhost:3000/a/b/c', headers: { 'foo': '1' }, qs: { bar: 2 }}, function(err, response, content) {
                assert.ifError(err)
                assert.equal(response.statusCode, 204)
                assert.equal(httq.templateVars.request.method, 'GET')
                assert.equal(httq.templateVars.request.headers['foo'], '1')
                assert.equal(httq.templateVars.request.query['bar'], '2')
                done()
            })
        })
    })
})