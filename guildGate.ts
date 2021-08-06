import AsyncLock from 'async-lock'
import { Guild } from 'discord.js'

import globalLogger from './logger.js'

const logger = globalLogger.child({ module: 'guildGate' })

export class GuildGate {
  private gate = new AsyncLock()

  private async workAtSpeed<T>(guild: Guild | null | undefined, work: () => Promise<T>, fast: boolean) {
    if (!guild || !guild.id) {
      logger.warn({ guild }, 'unsure of how to handle an gateable item with no guild, so silently ignoring')
      return await work()
    }

    return await this.gate.acquire(guild.id, work, { skipQueue: fast })
  }

  public async workFast<T>(guild: Guild | null | undefined, work: () => Promise<T>) {
    return await this.workAtSpeed(guild, work, true)
  }

  public async workSlow<T>(guild: Guild | null | undefined, work: () => Promise<T>) {
    return await this.workAtSpeed(guild, work, false)
  }
}