# httq
Middleware for bridging HTTP and AMQP

## Installation
npm install httq

## Prequisits
* RabbitMQ
* Familiarity with [Rascal](https://github.com/guidesmiths/rascal)

##

## Example Usage
```js
var httq = require('httq')
var rascal = require('rascal')
var express = require('express')
var bodyParser = require('body-parser')

// See the Rascal docs for configuring your definitions file
var definitions = require('./definitions.json')
var config = rascal.withDefaultConfig(definitions)

rascal.createBroker(config, function(err, broker) {
    if (err) {
        console.error(err.message)
        process.exit(1)
    }

    var app = express();
    app.use(bodyParser.json())
    app.post('*', httq.fireAndForget(broker, 'example:gateway'))
    app.listen(3000)

    console.log('Try: curl -H "Content-Type: application/json" -X POST -d \'{"message":"Hello World"}\' http://localhost:3000/messages/greetings')
})

```
