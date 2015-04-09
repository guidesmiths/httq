var httq = require('..')
var async = require('async')
var rascal = require('rascal')
var express = require('express')
var bodyParser = require('body-parser')
var config = require('./config.json')

var rascalConfig = rascal.withDefaultConfig(config.rascal)

rascal.createBroker(rascalConfig, function(err, broker) {

    if (err) bail(err)

    var app = express()
    app.use(bodyParser.json())
    httq.init(broker, config.httq.routes.book_loan_v1, function(err, middleware) {
        if (err) bail(err)
        app.post('/api/library/v1/books/:isbn/loans', middleware)
        app.listen(3000)
    })

    console.log('Try: $ curl -H "Content-Type: application/json" -X POST http://localhost:3000/api/library/v1/books/978-0132350884/loans -d \'{"member": "6545345"}\'')

    function bail(err) {
        console.error(err.message)
        process.exit(1)
    }
})