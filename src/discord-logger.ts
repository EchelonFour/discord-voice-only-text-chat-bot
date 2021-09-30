import { Client } from 'discord.js'

import globalLogger from './logger.js'
import config from './config.js'

const discordLogger = globalLogger.child({ module: 'discord' }, { level: config.get('logLevelDiscord') })

export function setUpDiscordLoggerListener(client: Client): void {
  client.on('debug', (message) => {
    discordLogger.debug(message)
  })
  client.on('error', (error) => {
    discordLogger.error(error, 'discord had an unknown error')
  })
  client.on('warn', (message) => {
    discordLogger.warn(message)
  })
  client.on('disconnect', (event: unknown, id) => {
    discordLogger.warn({ event, id }, 'discord disconnect')
  })
  client.on('shardDisconnect', (event, id) => {
    discordLogger.warn({ event, id }, 'discord shard disconnect')
  })
  client.on('shardError', (error, id) => {
    discordLogger.error({ error, id }, 'discord shard error')
  })
  client.on('shardReady', (id, unavailableGuilds) => {
    discordLogger.debug({ id, unavailableGuilds }, 'discord shard ready')
  })
  client.on('shardReconnecting', (id) => {
    discordLogger.debug({ id }, 'discord shard reconnecting')
  })
  client.on('shardResume', (id, replayedEvents) => {
    discordLogger.debug({ id, replayedEvents }, 'discord shard resume')
  })
}
