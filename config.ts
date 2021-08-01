import convict from 'convict'
import { existsSync } from 'fs'
import logger from './logger.js'

convict.addFormat({
  name: 'case-insentive-and-aplha-only',
  validate(val) {
    if (typeof val !== 'string') {
      throw new TypeError('must be a string')
    }
    if (val === '') {
      throw new TypeError('must not be empty')
    }
  },
  coerce(val) {
    return typeof val === 'string' ? val.toLowerCase().replace(/[^a-z]/g, '') : val
  }
})

export const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  magicRoleName: {
    doc: 'Name of the role that discord assigns when joining voice channel',
    format: 'case-insentive-and-aplha-only',
    default: 'currentlyinvoicechannel',
    env: 'MAGIC_ROLE',
  },
  discordToken: {
    doc: 'Discord bot token',
    format: String,
    default: null as unknown as string,
    env: 'DISCORD_TOKEN',
    sensitive: true,
  },
  logLevel: {
    doc: 'Level of logs to print to stdout',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    default: 'debug' as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',
    env: 'LOG_LEVEL',
  },
  logLevelDiscord: {
    doc: 'Level of logs to print to stdout for the discord library components',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    default: 'info' as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',
    env: 'LOG_LEVEL_DISCORD',
  },
})
const env = config.get('env')
const filesToLoad = [`./config/local.json`, `./config/${env}.json`]
for (const file of filesToLoad) {
  if (existsSync(file)) {
    config.loadFile(file)
  }
}

export default config