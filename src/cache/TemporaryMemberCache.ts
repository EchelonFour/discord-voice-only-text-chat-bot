import type { GuildMember, PartialGuildMember } from 'discord.js'
import BaseCache from './BaseCache'

export class TemporaryMemberCache extends BaseCache<GuildMember | PartialGuildMember> {
  protected key(item: GuildMember | PartialGuildMember): string {
    return item.id
  }
}
