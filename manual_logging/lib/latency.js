const measure = async (label, f) => {
  const start = new Date()

  console.log(`latency:${label} starting...`)
  return await f()
    .then(res => {
      const end = new Date()
      const duration = end - start
      console.log(`latency:${label} ${duration}`)
      return res
    })
    .catch(err => {
      const end = new Date()
      const duration = end - start
      console.log(`latency:${label} ${duration}`)
      throw err
    })
}

module.exports = {
  measure
}