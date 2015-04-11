# httq
Middleware for bridging HTTP and AMQP

## Installation
```js
npm install httq
```

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

    console.log('Try: curl -H "Content-Type: application/json" -X POST http://localhost:3000/api/library/v1/books/978-0132350884/loans')  -d \'{"member": "6545345"}\'

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
                    "requestPathToRoutingKey": {
                        "options": {
                            "method": {
                                "suffix": true,
                                "mapping": {
                                    "POST": "created"
                                }
                            }
                        }
                    },
                    "fireAndForget": {
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
$ curl -H "Content-Type: application/json" -X POST -d '{"member":"6545345"}' http://localhost:3000/api/library/v1/books/978-0132350884/loans
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

## Middelware
httq middleware needs to be initialised for each route in your express application, by passing httq.init with a broker, configuration, ctx (optional), and callback. The init method will build a chain of middleware in the order defined by the sequence attribute. If you need to pass paramters to a specific middleware then specifiy it in the warez block.

```json
{
    "sequence": ["requestToTemplateVars", "requestPathToRoutingKey", "requestToMessage", "fireAndForget"],
    "warez": {
        "requestPathToRoutingKey": {
            "options": {
                "method": {
                    "suffix": true,
                    "mapping": {
                        "POST": "created"
                    }
                }
            }
        },
        "fireAndForget": {
            "options": {
                "publication": "p1"
            }
        }
    }
}
```
Each middleware in the chain should export a single function that expects the config, context and callback. It should return the a function with typical express middleware signature.

```js
module.exports = function(config, ctx, next) {
    // ...
    next(null, function(req, res, next) {
        // ...
    })
}
```

### Provided Middleware

#### requestToTemplateVars
Extracts variables from the request and stores them in ctx.templateVars, e.g.
```js
{
    templateVars: {
        method: "POST",
        url: "/api/library/v1/books/978-0132350884/loans",
        params: {
            isbn: "978-0132350884"
        },
        headers: {
            user-agent: "curl/7.30.0",
            host: "localhost:3000",
            accept: "*/*",
            content-type: "application/json",
            content-length: "20"
        }
        query: {
        }
    }
}
These are typically usd when generating the routing key and message published to your AMQP broker.

#### requestToRoutingKey
Generates a routing key from the request by passing the templateVars through a hogan template. The routing key is stored in ctx.message.routingKey
```json
{
    "requestToRoutingKey": {
        "type": "requestToRoutingKey",
        "options": {
            "template": "library.v2.books.loans.{{request.method}}"
        }
    }
}
```
You can map the request method to something more meaningful
```js
{
    "requestToRoutingKey": {
        "type": "requestToRoutingKey",
        "options": {
            "template": "library.v2.books.loans.{{request.method}}"
            "method": {
                "mapping": {
                    "POST": "created"
                }
            }
        }
    }
}
```

#### requestPathToRoutingKey
Generates a routing key from the request by replacing slashes with full stops. The routing key is stored in ctx.message.routingKey. No parameters are required but you may optionall include the request method.
```json
{
    "requestPathToRoutingKey": {
        "type": "requestPathToRoutingKey",
        "options": {
            "method": {
                "prefix": true,
                "mapping": {
                    "POST": "created"
                }
            }
        }
    }
}
```

#### requestToMessage
Generates AMQP message headers and content from the request. This is stored in ctx.message.headers and ctx.message.content. You can see an example of the generated message in step 4.

#### requestToMessageContent
Generates AMQP message content from the request. A json document reprsenting the full request (url, params, headers, query parameters and body) is stored in ctx.message.content

#### fireAndForget
Publishes the AMQP message to a Rascal publication using the routing key defined in the context. If successful the middleware will return 202 "Accepted" and a transaction id corresponding to the message id
```json
{"txid":"c09f94a4-f152-46d5-8266-39505bb446a1"}
```

### Custom Middlware
You can override the httq middleware or add your own by initialising the ctx "warez" attribute, e.g.

```js
var customFireAndForget = require('./lib/customFireAndForget')
var extraMiddleware = require('./lib/extraMiddleware')

httq.init(broker, config.httq.book_loan_v1, {
    warez: {
        fireAndForget: customFireAndForget,
        extraMiddleware: extraMiddleware
    }
}, function(err, httqs) {
    //...
})
```

## Handling Errors
In most cases you should simply return next(err) and let your express default error handler deal with it. Where an httq provided middleware depends on a library that emits errors (e.g. Rascal) it will log details of the error to the console. If you would prefer a different behaviour, specify an alternative error handler when initialising httq.

```js
httq.init(broker, config.httq.book_loan_v1, {
    errorHandler: errorHandler
}, function(err, httqs) {
    //...
})

function errorHandler(err, details) {
    //...
}
```



