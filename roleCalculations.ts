import type { VoiceChannel, Role, Collection } from 'discord.js'
import config from './config.js'

function stripAndLowerCase(string: string): string {
  return string.toLowerCase().replace(/[^a-z]/g, '')
}
function findRolesForVoiceChannel(voiceChannel: VoiceChannel): Collection<string, Role> {
  const magicGeneralRoleName = config.get('magicRoleName')
  const magicVoiceChannelRoleName = `${magicGeneralRoleName}${stripAndLowerCase(voiceChannel.name)}`
  return voiceChannel.guild.roles.cache.filter((role) => {
    const roleName = stripAndLowerCase(role.name)
    return roleName == magicGeneralRoleName || roleName == magicVoiceChannelRoleName
  })
}
export function calculateRoleDifference(
  oldChannel: VoiceChannel | null,
  newChannel: VoiceChannel | null,
):
  | [Collection<string, Role>, Collection<string, Role>]
  | [Collection<string, Role> | null, Collection<string, Role>]
  | [Collection<string, Role>, Collection<string, Role> | null] {
  if (!oldChannel && newChannel) {
    return [null, findRolesForVoiceChannel(newChannel)]
  }
  if (oldChannel && !newChannel) {
    return [findRolesForVoiceChannel(oldChannel), null]
  }
  if (oldChannel && newChannel) {
    const oldRoles = findRolesForVoiceChannel(oldChannel)
    const newRoles = findRolesForVoiceChannel(newChannel)
    const keptRoles = oldRoles.intersect(newRoles)
    oldRoles.sweep((_, key) => keptRoles.has(key))
    newRoles.sweep((_, key) => keptRoles.has(key))
    return [oldRoles, newRoles]
  }
  throw new Error('user moved from no channel to no channel????')
}
