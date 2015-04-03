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
The queued message will be approximately* as follows
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
        "messageId": "c0f8feca-97ff-4ff3-8cc9-49c5ff61c877"
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
The message content will actually be a buffer, but if you use Rascal to consume the message it will automatically decoded and provided via the content parameter, e.g.
```js
broker.subscribe("s1", function(err, rawMessage, content) {
    ...
})
```
