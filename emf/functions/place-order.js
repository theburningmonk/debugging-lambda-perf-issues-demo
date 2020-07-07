const eventBridge = require('@dazn/lambda-powertools-eventbridge-client')
const chance = require('chance').Chance()
const Log = require('@dazn/lambda-powertools-logger')
const wrap = require('@dazn/lambda-powertools-pattern-basic')

const busName = process.env.bus_name

module.exports.handler = wrap(async (event) => {
  const restaurantName = JSON.parse(event.body).restaurantName

  const orderId = chance.guid()
  Log.debug('placing order...', { orderId, restaurantName })

  await eventBridge.putEvents({
    Entries: [{
      Source: 'big-mouth',
      DetailType: 'order_placed',
      Detail: JSON.stringify({
        orderId,
        restaurantName,
      }),
      EventBusName: busName
    }]
  }).promise()

  Log.debug(`published event into EventBridge`, {
    eventType: 'order_placed',
    busName
  })

  const response = {
    statusCode: 200,
    body: JSON.stringify({ orderId })
  }

  return response
})