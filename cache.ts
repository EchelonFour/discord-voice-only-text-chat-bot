import { Collection, Guild, GuildMember, Invite, PartialGuildMember } from 'discord.js'

import globalLogger from './logger.js'

const logger = globalLogger.child({ module: 'cache' })


abstract class BaseCache<T extends { guild: Guild | null }> {
  protected cache = new Collection<string, Collection<string, T>>()

  public getGuild(guild: Guild) {
    let cacheForGuild = this.cache.get(guild.id)
    if (!cacheForGuild) {
      cacheForGuild = new Collection<string, T>()
      this.cache.set(guild.id, cacheForGuild)
    }
    return cacheForGuild
  }

  public has(item: T): boolean {
    if (!item.guild) {
      logger.warn({ item }, 'unsure of how to handle an cachable item with no guild, so silently ignoring')
      return false
    }
    return this.cache.get(item.guild.id)?.has(this.key(item)) || false
  }

  public addToCache(item: T) {
    if (!item.guild) {
      logger.warn({ item }, 'unsure of how to handle an cachable item with no guild, so silently ignoring')
      return
    }
    this.getGuild(item.guild).set(this.key(item), item)
  }

  public deleteFromCache(item: T) {
    if (!item.guild) {
      logger.warn({ item }, 'unsure of how to handle an cachable item with no guild, so silently ignoring')
      return
    }
    this.getGuild(item.guild).delete(this.key(item))
  }

  protected abstract key(item: T): string;

}
export class InviteCache extends BaseCache<Invite> {
  protected key(item: Invite): string {
    return item.code
  }

  public async fetchAndCache(guild: Guild) {
    const guildInvites = await guild.fetchInvites()
    this.cache.set(guild.id, guildInvites)
    return guildInvites
  }
}

export class TemporaryMemberCache extends BaseCache<GuildMember | PartialGuildMember> {
  protected key(item: GuildMember | PartialGuildMember): string {
    return item.id
  }
}