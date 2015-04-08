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
    httq.init(broker, config.httq.book_loan_v1, function(err, httqs) {
        if (err) bail(err)
        app.post('/api/library/v1/books/:isbn/loans', httqs.book_loan_v1)
        app.listen(3000)
    })

    console.log('Try: curl -H "Content-Type: application/json" -X POST -d \'{"message":"Hello World"}\' http://localhost:3000/messages/greetings')

    function bail(err) {
        console.error(err.message)
        process.exit(1)
    }
})
```

### Step 2 - Configure httq and rascal
```json
{
    "httq": {
        "routes": {
            "book_loan_v1": {
                "methods": ["post"],
                "pattern": "/api/library/v1/books/:isbn/loans",
                "sequence": ["requestToTemplateVars", "requestPathToRoutingKey", "requestToMessage", "fireAndForget"],
                "warez": {
                    "requestToTemplateVars": {
                        "type": "requestToTemplateVars"
                    },
                    "requestPathToRoutingKey": {
                        "type": "requestPathToRoutingKey",
                        "options": {
                            "method": {
                                "suffix": true,
                                "mapping": {
                                    "POST": "created"
                                }
                            }
                        }
                    },
                    "requestToMessage": {
                        "type": "requestToMessage"
                    },
                    "fireAndForget": {
                        "type": "fireAndForget",
                        "options": {
                            "publication": "p1"
                        }
                    }
                }
            }
        }
    },
    "rascal": {
        "vhosts": {
            "/": {
                "namespace": true,
                "exchanges": {
                    "e1": {}
                },
                "queues": {
                    "q1": {}
                },
                "bindings": {
                    "b1": {
                        "source": "e1",
                        "destination": "q1",
                        "bindingKey": "api.library.v1.#.loans.created"
                    }
                }
            }
        },
        "publications": {
            "p1": {
                "exchange": "e1"
            }
        },
        "subscriptions": {
            "s1": {
                "queue": "q1"
            }
        }
    }
}
```
### Step 3 - Start the app and send it an HTTP request
```json
$ node server.js &
$ curl -H "Content-Type: application/json" -X POST -d \'{"member":"6545345"}\' http://localhost:3000/api/library/v1/books/978-0132350884/loans
{"txid":"c09f94a4-f152-46d5-8266-39505bb446a1"}
```
### Step 4 - Check your broker for the message.
It should look something like this:
```json
{
  "fields": {
    "consumerTag": "amq.ctag-Nw13m2-6DntZKTS1PhK5gg",
    "deliveryTag": 1,
    "redelivered": false,
    "exchange": "e1",
    "routingKey": "api.library.v1.books.978-0132350884.loans.created"
  },
  "properties": {
    "contentType": "application/json",
    "headers": {
      "httq": {
        "method": "POST",
        "url": "/api/library/v1/books/978-0132350884/loans",
        "query": {},
        "headers": {
          "user-agent": "curl/7.30.0",
          "host": "localhost:3000",
          "accept": "*/*",
          "content-type": "application/json",
          "content-length": "20"
        },
        "params": {
          "isbn": "978-0132350884"
        }
      }
    },
    "deliveryMode": 2,
    "messageId": "c09f94a4-f152-46d5-8266-39505bb446a1"
  },
  "content": {
    "member": "6545345"
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
```
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



