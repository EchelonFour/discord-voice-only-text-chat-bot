import config from './config.js'
import logger from './logger.js'

config.validate({
  allowed: 'strict',
  output: (message) => {
    logger.error(message)
  }
})