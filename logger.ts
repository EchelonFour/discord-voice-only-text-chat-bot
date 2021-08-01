import pino from 'pino'
import config from './config.js'

export const logger = pino({
  level: config.get('logLevel')
})

// use pino.final to create a special logger that
// guarantees final tick writes
const handler = pino.final(logger, (err, finalLogger, evt) => {
  finalLogger.info(`${evt} caught`)
  if (err) finalLogger.error(err, 'error caused exit')
  process.exit(err ? 1 : 0)
})
process.on('uncaughtException', (err) => handler(err, 'uncaughtException'))

export default logger