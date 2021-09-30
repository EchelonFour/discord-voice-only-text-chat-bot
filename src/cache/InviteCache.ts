import type { Collection, Guild, Invite } from 'discord.js'
import { GuildGate } from '../guildGate'
import BaseCache from './BaseCache'

export class InviteCache extends BaseCache<Invite> {
  protected _gate = new GuildGate()

  protected key(item: Invite): string {
    return item.code
  }

  public async fetchAndCache(guild: Guild): Promise<Collection<string, Invite>> {
    const guildInvites = await guild.fetchInvites()
    this.cache.set(guild.id, guildInvites)
    return guildInvites
  }

  public get gate(): GuildGate {
    return this._gate
  }
}
