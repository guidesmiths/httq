var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var httq = require('..')

describe('Pipeline', function() {

    it('should return middleware in the specified sequence', function(done) {

        var config = {
            pattern: "/api/:system",
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
            a: function(next) {
                next(null, function a() {})
            },
            b: function(next) {
                next(null, function b() {})
            },
            c: function(next) {
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
})
