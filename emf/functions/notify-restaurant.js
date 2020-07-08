const eventBridge = require('@dazn/lambda-powertools-eventbridge-client')
const sns = require('@dazn/lambda-powertools-sns-client')
const Log = require('@dazn/lambda-powertools-logger')
const wrap = require('@dazn/lambda-powertools-pattern-basic')
const { metricScope, Unit } = require('aws-embedded-metrics')

const busName = process.env.bus_name
const topicArn = process.env.restaurant_notification_topic

module.exports.handler = wrap(metricScope(metrics => 
  async (event, context) => {
    metrics.setNamespace('emf-demo')
    metrics.setProperty("RequestId", context.awsRequestId)
    
    const snsStart = new Date()
    const order = event.detail
    const snsReq = {
      Message: JSON.stringify(order),
      TopicArn: topicArn
    };
    await sns.publish(snsReq).promise()
    const snsEnd = new Date()
    metrics.putMetric("latency.SNS.publish", snsEnd - snsStart, Unit.Milliseconds)

    const { restaurantName, orderId } = order
    Log.debug(`notified restaurant of new order`, {
      restaurantName,
      orderId
    })

    const ebStart = new Date()
    await eventBridge.putEvents({
      Entries: [{
        Source: 'big-mouth',
        DetailType: 'restaurant_notified',
        Detail: JSON.stringify(order),
        EventBusName: busName
      }]
    }).promise()
    const ebEnd = new Date()
    metrics.putMetric("latency.EventBridge.putEvents", ebEnd - ebStart, Unit.Milliseconds)

    Log.debug(`published event into EventBridge`, {
      eventType: 'restaurant_notified',
      busName
    })
  }
))