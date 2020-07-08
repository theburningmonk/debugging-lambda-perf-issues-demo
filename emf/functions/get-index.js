const fs = require("fs")
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')
const Log = require('@dazn/lambda-powertools-logger')
const wrap = require('@dazn/lambda-powertools-pattern-basic')
const CorrelationIds = require('@dazn/lambda-powertools-correlation-ids')
const { metricScope, Unit } = require('aws-embedded-metrics')

const restaurantsApiRoot = process.env.restaurants_api
const ordersApiRoot = process.env.orders_api
const awsRegion = process.env.AWS_REGION

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const template = fs.readFileSync('static/index.html', 'utf-8')

const getRestaurants = async () => {
  Log.debug('getting restaurants...', { url: restaurantsApiRoot })
  const url = URL.parse(restaurantsApiRoot)
  const opts = {
    host: url.hostname,
    path: url.pathname
  }

  aws4.sign(opts)

  const start = new Date()
  const httpResp = await http.get(restaurantsApiRoot, {
    headers: Object.assign({}, opts.headers, CorrelationIds.get())
  })
  const end = new Date()
  global.metrics.putMetric("latency.HTTP.getRestaurants", end - start, Unit.Milliseconds)

  return httpResp.data
}

module.exports.handler = wrap(metricScope(metrics => 
  async (event, context) => {
    metrics.setNamespace('emf-demo')
    metrics.setProperty("RequestId", context.awsRequestId)
    global.metrics = metrics

    const restaurants = await getRestaurants()
    Log.debug('got restaurants', { count: restaurants.length })
    const dayOfWeek = days[new Date().getDay()]
    const view = {
      awsRegion,
      dayOfWeek,
      restaurants,
      searchUrl: `${restaurantsApiRoot}/search`,
      placeOrderUrl: `${ordersApiRoot}`
    }
    const html = Mustache.render(template, view)
    const response = {
      statusCode: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8'
      },
      body: html
    }

    return response
  }
))