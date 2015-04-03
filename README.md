# httq
Middleware for bridging HTTP and AMQP

## Installation
npm install httq

## Prequisits
* RabbitMQ
* Familiarity with [Rascal](https://github.com/guidesmiths/rascal)

## Usage
### Step 1 - Plug httq into an express app
```js
var httq = require('httq')
var rascal = require('rascal')
var express = require('express')
var bodyParser = require('body-parser')

// See the Rascal docs for help configuring your definitions file
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
})
```
### Step 2 - Start the app and send it an HTTP request
```json
$ node server.js &
$ curl -H "Content-Type: application/json" -X POST -d \'{"message":"Hello World"}\' http://localhost:3000/messages/greetings
{"txid":"1498ac51-6067-4084-8f18-1b8fac50f9ef"}
```
### Step 3 - Check your broker for the message.
It should look something like this:
```json
{
    "fields": {
        "consumerTag": "amq.ctag-YpVQVwlMcUejC20LuxFe5g",
        "deliveryTag": 1,
        "redelivered": true,
        "exchange": "gateway",
        "routingKey": "messages.greetings"
    },
    "properties": {
        "contentType": "application/json",
        "headers": {},
        "deliveryMode": 2,
        "messageId": "1498ac51-6067-4084-8f18-1b8fac50f9ef"
    },
    "content": {
        "headers":{
            "user-agent":"curl/7.30.0",
            "host":"localhost:3000",
            "accept":"*/*",
            "content-type":"application/json",
            "content-length":"25"
        },
        "body":{
            "message":"Hello World"
        }
    }
}
```
