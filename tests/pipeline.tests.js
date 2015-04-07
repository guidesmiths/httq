var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var httq = require('..')

describe('Pipeline', function() {

    it('should return warez in the specified sequence', function(done) {

        var config = {
            sequence: ["a", "c", "b"],
            warez: {
                a: {
                    type: "a"
                },
                b: {
                    type: "b"
                },
                c: {
                    type: "c"
                }
            }
        }

        httq(config, {
            a: function(config, ctx, next) {
                next(null, function a() {})
            },
            b: function(config, ctx, next) {
                next(null, function b() {})
            },
            c: function(config, ctx, next) {
                next(null, function c() {})
            }
        }, function(err, warez) {
            assert.equal(warez.length, 3)
            assert.equal(warez[0].name, 'a')
            assert.equal(warez[1].name, 'c')
            assert.equal(warez[2].name, 'b')
            done()
        })
    })

    it('should initialise warez with options', function(done) {
        var config = {
            sequence: ["a"],
            warez: {
                a: {
                    type: "a",
                    options: {
                        foo: 1,
                        bar: 2
                    }
                }
            }
        }

        httq(config, {
            a: function(options, ctx, next) {
                next(null, function a() {
                    return options
                })
            }
        }, function(err, warez) {
            assert.equal(warez[0](), config.warez.a.options)
            done()
        })
    })


    it('should initialise warez with shared context', function(done) {

        var config = {
            sequence: ["a", "b"],
            warez: {
                a: {
                    type: "a"
                },
                b: {
                    type: "b"
                }
            }
        }

        var shared = {
            z: true
        }

        httq(config, {
            a: function(options, ctx, next) {
                next(null, function a(cb) {
                    ctx.a = true
                    cb()
                })
            },
            b: function(options, ctx, next) {
                next(null, function b(cb) {
                    ctx.b = true
                    cb()
                })
            }
        }, shared, function(err, warez) {
            async.parallel(warez, function() {
                assert.ok(shared.a)
                assert.ok(shared.b)
                assert.ok(shared.z)
                done()
            })
        })
    })
})
