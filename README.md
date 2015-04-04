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
var toRoutingKey = httq.transformers.pathToRoutingKey()
var definitions = require('./definitions.json')

var config = rascal.withDefaultConfig(definitions)

rascal.createBroker(config, function(err, broker) {

    if (err) {
        console.error(err.message)
        process.exit(1)
    }

    var app = express();
    app.use(bodyParser.json())
    app.post('*', httq.middleware.fireAndForget(broker, 'example:gateway', toRoutingKey))
    app.listen(3000)

    console.log('Try: curl -H "Content-Type: application/json" -X POST -d \'{"message":"Hello World"}\' http://localhost:3000/messages/greetings')
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

## Routing Key Transformers

### Path to Routing Key
Path to routing key replaces slashes\(/\) with full stops\(.\) and strips off the initial slash. It's a reasonable choice but would limited if you're bridging a RESTful interface that makes use of HTTP verbs. To work around this situation you can configure the transformer to append the method and even to substitute the method for a human friendly alternative.
```js
var toRoutingKey = httq.transformerspathToRoutingKey({
    method: true,
    alt: {
        GET: 'requested',
        POST: 'created',
        PUT: 'amended',
        DELETE: 'deleted'
    }
})
```
If you chose not to specify the alt options, the method will be converted to lower case.

### Request to Routing Key
Request to routing key extracts data from the HTTP method, request headers and request url (using node's url.parse and expresses url parameter algorithm). The data is used to render a [hogan](http://twitter.github.io/hogan.js/) template of yoru specification.
```js
var toRoutingKey = httq.transformers.requestToRoutingKey({
    pattern: '/:primary/:secondary',
    template: 'api.{{headers.version}}.{{params.primary}}.{{params.secondary}}.{{method_alt}}',
    alt: {
        GET: 'requested',
        POST: 'created',
        PUT: 'amended',
        DELETE: 'deleted'
    }
})

```
You can see the full set of available parameters [here](https://github.com/guidesmiths/request-token)






