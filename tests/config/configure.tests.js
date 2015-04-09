var format = require('util').format
var assert = require('assert')
var configure = require('../../lib/config/configure')

describe('configure', function() {

    it('should default warez from the sequence', function(done) {

        var config = {
            sequence: ['a']
        }

        configure(config, function(err, routeConfig) {
            assert.ifError(err)
            assert.ok(routeConfig.warez.a)
            assert.ok(routeConfig.warez.a.type, 'a')
            done()
        })
    })

    it('should default warez type from the name', function(done) {
        var config = {
            sequence: ['a'],
            warez: {
                'a': {
                }
            }
        }

        configure(config, function(err, routeConfig) {
            assert.ifError(err)
            assert.ok(routeConfig.warez.a)
            assert.ok(routeConfig.warez.a.type, 'a')
            done()
        })
    })

    it('should not interfere with specified config', function(done) {
        var config = {
            sequence: ['a'],
            warez: {
                'a': {
                    options: {
                        foo: 1
                    }
                }
            }
        }

        configure(config, function(err, routeConfig) {
            assert.ifError(err)
            assert.ok(routeConfig.warez.a)
            assert.ok(routeConfig.warez.a.type, 'a')
            assert.ok(routeConfig.warez.a.options.foo, 1)
            done()
        })
    })
})