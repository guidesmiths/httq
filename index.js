var debug = require('debug')('httq:index')
var format = require('util').format
var _ = require('lodash')

module.exports = function init(broker, libraries, config) {
    if (arguments.length === 2) return init(broker, {}, arguments[1])

    publishers = _.defaults(libraries.publishers || {}, require('./lib/publishers'))
    transformers = _.defaults(libraries.transformers || {}, require('./lib/transformers'))

    return function(destination) {
        var destinationConfig = config.destinations[destination]
        var publisher = getPublisher(destinationConfig.publication, destinationConfig.publisher)
        var transformer = getTransformer(destinationConfig.transformer)

        return function(req, res, next) {
            transformer(req, function(err, envelope) {
                publisher(envelope, res, next)
            })
        }
    }

    function getPublisher(publication, name) {
        debug(format('Getting publisher: %s for publication: %s', name, publication))
        var publisherConfig = config.publishers[name]
        return publishers[publisherConfig.type](broker, publication, publisherConfig.options)
    }

    function getTransformer(name) {
        debug(format('Getting transformer: %s', name))
        var transformerConfig = config.transformers[name]
        return transformers[transformerConfig.type](transformerConfig.options)
    }

}