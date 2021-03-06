const DocumentClient = require('aws-sdk/clients/dynamodb').DocumentClient
const dynamodb = new DocumentClient()
const { ssm } = require('middy/middlewares')
const Log = require('@dazn/lambda-powertools-logger')
const wrap = require('@dazn/lambda-powertools-pattern-basic')
const { metricScope, Unit } = require('aws-embedded-metrics')

const { serviceName, stage } = process.env

const tableName = process.env.restaurants_table

const findRestaurantsByTheme = async (theme, count) => {
  Log.debug(`finding restaurants with the theme...`, {
    count,
    theme
  })
  const req = {
    TableName: tableName,
    Limit: count,
    FilterExpression: "contains(themes, :theme)",
    ExpressionAttributeValues: { ":theme": theme }
  }

  const start = new Date()
  const resp = await dynamodb.scan(req).promise()
  const end = new Date()
  global.metrics.putMetric("latency.DynamoDB.scan", end - start, Unit.Milliseconds)

  Log.debug('found restaurants', {
    count: resp.Items.length
  })
  return resp.Items
}

module.exports.handler = wrap(metricScope(metrics => 
  async (event, context) => {
    metrics.setNamespace('emf-demo')
    metrics.setProperty("RequestId", context.awsRequestId)
    global.metrics = metrics
    
    const req = JSON.parse(event.body)
    const theme = req.theme
    const restaurants = await findRestaurantsByTheme(theme, process.env.defaultResults)
    const response = {
      statusCode: 200,
      body: JSON.stringify(restaurants)
    }

    return response
  }
)).use(ssm({
  cache: true,
  cacheExpiryInMillis: 5 * 60 * 1000, // 5 mins
  names: {
    config: `/${serviceName}/${stage}/search-restaurants/config`
  },
  onChange: () => {
    const config = JSON.parse(process.env.config)
    process.env.defaultResults = config.defaultResults
  }
}))