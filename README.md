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
var config = require('./config.json')

var rascalConfig = rascal.withDefaultConfig(config.rascal)

rascal.createBroker(rascalConfig, function(err, broker) {

    if (err) {
        console.error(err.message)
        process.exit(1)
    }

    var app = express();
    app.use(bodyParser.json())
    app.post('*', httq(broker, config.httq)('example_gateway'))
    app.listen(3000)

    console.log('Try: curl -H "Content-Type: application/json" -X POST -d \'{"message":"Hello World"}\' http://localhost:3000/messages/greetings')
})
```

### Step 2 - Configure httq and rascal
```json
{
    "httq": {
        "destinations": {
            "example_gateway": {
                "publisher": "default",
                "transformer": "default",
                "publication": "example:gateway"
            }
        },
        "publishers": {
            "default": {
                "type": "fireAndForget"
            }
        },
        "transformers": {
            "default": {
                "type": "pathToRoutingKey"
            }
        }
    },
    "rascal": {
        "vhosts": {
            "example": {
                "connection": {
                    "vhost": "/",
                    "user": "guest",
                    "password": "guest"
                },
                "exchanges": {
                    "gateway": {
                    }
                },
                "queues": {
                     "demo": {
                     }
                },
                "bindings": {
                    "gateway:demo": {
                        "source": "gateway",
                        "destination": "demo"
                    }
                }
            }
        },
        "publications": {
            "example:gateway": {
                "vhost": "example",
                "exchange": "gateway",
                "confirm": true
            }
        }
    }
}
```

### Step 3 - Start the app and send it an HTTP request
```json
$ node server.js &
$ curl -H "Content-Type: application/json" -X POST -d \'{"message":"Hello World"}\' http://localhost:3000/messages/greetings
{"txid":"1498ac51-6067-4084-8f18-1b8fac50f9ef"}
```

### Step 4 - Check your broker for the message.
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

## Transformers
Transformers convert the inbound HTTP request into the outbound AMQP message. Their output must be an object containing two properties
```js
{
    routingKey: 'some.routing.key',
    content: {
        anything: "you want to send, but typically request headers and body"
    }
}
httq provides two out of the box transformers, pathToRoutingKey and requestToRoutingKey.

### pathToRoutingKey transformer
Path to routing key replaces slashes\(/\) with full stops\(.\) and strips off the initial slash. By default the published message with container the http request headers and body
```json
{
    "headers": {
        "Content-Type": "application/json"
    },
    "body": {
        "foo": "bar"
    }
}
```
If you don't need the headers and would prefer to send the body directly, enable ```body_only``` in the transformer options
```js
{
var toRoutingKey = httq.transformerspathToRoutingKey({
    body_only: true
}
```
The pathToRoutingKey transformer is a reasonable choice but somewhat limited if you're bridging a RESTful interface that makes use of HTTP verbs. To work around this situation you can configure the transformer to append the method and even to substitute the method for a human friendly alternative.
```js
var toRoutingKey = httq.transformerspathToRoutingKey({
    method: true,
    method_alt: {
        GET: 'requested',
        POST: 'created',
        PUT: 'amended',
        DELETE: 'deleted'
    }
})
```
If you chose not to specify the method_alt options, the method will be converted to lower case.

### requestToRoutingKey transformer
Request to routing key extracts data from the HTTP method, request headers and request url (using node's url.parse and expresses url parameter algorithm). The data is used to render a [hogan](http://twitter.github.io/hogan.js/) template of your specification. It also supports the method_alt and body_only parameters.
```js
var toRoutingKey = httq.transformers.requestToRoutingKey({
    pattern: '/:primary/:secondary',
    template: 'api.{{headers.version}}.{{params.primary}}.{{params.secondary}}.{{method_alt}}',
    method_alt: {
        GET: 'requested',
        POST: 'created',
        PUT: 'amended',
        DELETE: 'deleted'
    },
    body_only: true
})

```
You can see the full set of available parameters [here](https://github.com/guidesmiths/request-token)

## Publishers
A publisher's job is to send the message to the AMQP broker, and to a return an appropriate HTTP response. Currently only one publisher, fireAndForget is provided but we have plans for requestAndResponse too.

### fireAndForget publisher
The fire and forget publisher publishes a message to the specified destination and replies with 202 "Accepted". The body of the response contains a transaction id for tracking purposes.
```json
{
    "txid": "1498ac51-6067-4084-8f18-1b8fac50f9ef"
}



