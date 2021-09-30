import { Collection, Guild, Invite } from 'discord.js'

import { InviteCache } from './cache.js'
import globalLogger from './logger.js'

const logger = globalLogger.child({ module: 'invite' })

function usagesWithUsedRange(bigger: number | null | undefined, smaller: number | null | undefined): boolean {
  const diff = (bigger || 0) - (smaller || 0)
  return diff == 1 || diff == 2
}

function determineWhichInviteWasUsed(
  oldInvitesForGuild: Collection<string, Invite> | null,
  newInvitesForGuild: Collection<string, Invite>,
) {
  if (oldInvitesForGuild) {
    for (const oldInvite of oldInvitesForGuild.values()) {
      const newInvite = newInvitesForGuild.get(oldInvite.code)
      if (!newInvite && oldInvite.maxUses && usagesWithUsedRange(oldInvite.maxUses, oldInvite.uses)) {
        // if this invite was gone, it was maybe used????
        return oldInvite
      }
      if (newInvite && usagesWithUsedRange(newInvite.uses, oldInvite.uses)) {
        return newInvite
      }
    }
  }
  return null
}
export async function determineIfTemporaryInviteUsedAndUpdateInviteCache(guild: Guild, cache: InviteCache) {
  const guildLogger = logger.child({ guild: guild.id })
  return cache.gate.workFast(guild, async () => {
    const oldInvites = cache.getGuild(guild)
    guildLogger.debug('fetching invites for guild %s', guild.name)
    const newInvites = await cache.fetchAndCache(guild)
    const inviteUsed = determineWhichInviteWasUsed(oldInvites, newInvites)
    guildLogger.debug({ inviteUsed }, 'new user used invite %s', inviteUsed?.code || 'unknown')
    return inviteUsed && inviteUsed.temporary
  })
}
