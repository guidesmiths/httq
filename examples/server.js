var httq = require('..')
var rascal = require('rascal')
var express = require('express')
var bodyParser = require('body-parser')
var definitions = require('./definitions.json')

var config = rascal.withDefaultConfig(definitions)

rascal.createBroker(config, function(err, broker) {
    if (err) {
        console.error(err.message)
        process.exit(1)
    }

    var app = express();
    app.use(bodyParser.json())
    app.post('*', httq.fireAndForget(broker, 'universe'))
    app.listen(3000)

    console.log('Try: curl -H "Content-Type: application/json" -X POST -d \'{"foo":"bar"}\' http://localhost:3000')
})