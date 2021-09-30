import { Collection, Guild } from 'discord.js'

import globalLogger from '../logger.js'

const logger = globalLogger.child({ module: 'cache' })

export default abstract class BaseCache<T extends { guild: Guild | null }> {
  protected cache = new Collection<string, Collection<string, T>>()

  public getGuild(guild: Guild): Collection<string, T> {
    let cacheForGuild = this.cache.get(guild.id)
    if (!cacheForGuild) {
      cacheForGuild = new Collection<string, T>()
      this.cache.set(guild.id, cacheForGuild)
    }
    return cacheForGuild
  }

  public has(item: T): boolean {
    if (!item.guild) {
      logger.warn({ item }, 'unsure of how to handle looking up a cachable item with no guild, so silently ignoring')
      return false
    }
    return this.cache.get(item.guild.id)?.has(this.key(item)) || false
  }

  public addToCache(item: T): void {
    if (!item.guild) {
      logger.warn({ item }, 'unsure of how to handle adding a cachable item with no guild, so silently ignoring')
      return
    }
    this.getGuild(item.guild).set(this.key(item), item)
  }

  public deleteFromCache(item: T): void {
    if (!item.guild) {
      logger.warn({ item }, 'unsure of how to handle deleting a cachable item with no guild, so silently ignoring')
      return
    }
    this.getGuild(item.guild).delete(this.key(item))
  }

  protected abstract key(item: T): string
}
