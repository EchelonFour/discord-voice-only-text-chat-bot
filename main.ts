
import { Client, GuildMember, Intents, VoiceChannel, Role, Collection } from 'discord.js'
import config from './config.js'
import logger from './logger.js'

import './init.js'

const botLogger = logger.child({ module: 'bot' })

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
function calculateRoleDifference(oldChannel: VoiceChannel | null, newChannel: VoiceChannel | null): [Collection<string, Role>, Collection<string, Role>] | [Collection<string, Role> | null, Collection<string, Role>] | [Collection<string, Role>, Collection<string, Role> | null] {
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

const clientIntents = [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES]
if (config.get('autoAssignedRole')) {
  botLogger.info('Also listening on members joining or leaving')
  clientIntents.push(Intents.FLAGS.GUILD_MEMBERS)
}
const client = new Client({
  ws: {
    intents: clientIntents
  }
});
client.on('ready', () => {
  botLogger.info('Ready')
})
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.channelID == newState.channelID) {
    botLogger.trace('user muted or defeaned or whatever. dont care')
    return
  }
  try {
    botLogger.info(`voiceStateUpdate event with user ${(oldState.member || newState.member)?.displayName} going from ${oldState.channel?.name} to ${newState.channel?.name}`)
    const roles = calculateRoleDifference(oldState.channel, newState.channel)
    if (roles[0]?.size && oldState.member) { // something to be deleted
      botLogger.debug(`${oldState.member.displayName} removed from roles ${roles[0].map(role => role.name).join(', ')}`)
      await oldState.member.roles.remove(roles[0], `They left the ${oldState.channel!.name} voice channel`)
    }
    if (roles[1]?.size && newState.member) { // something to be added
      botLogger.debug(`${newState.member.displayName} added to roles ${roles[1].map(role => role.name).join(', ')}`)
      await newState.member.roles.add(roles[1], `They joined the ${newState.channel!.name} voice channel`)
    }
  } catch (err) {
    botLogger.error(err, 'failed to mess with roles')
  }

});
const discordLogger = logger.child({ module: 'discord' }, { level: config.get('logLevelDiscord') })
client.on('debug', message => {
  discordLogger.debug(message)
})
client.on('error', message => {
  discordLogger.error( message)
})
client.on('warn', message => {
  discordLogger.warn(message)
})
client.on('disconnect', () => {
  discordLogger.warn('disconnect')
})
client.on('guildMemberAdd', async (member) => {
  const roleToAdd = config.get('autoAssignedRole')
  if (roleToAdd) {
    botLogger.info({ member }, 'guildMemberAdd event fired')
    botLogger.debug('adding role "%s" to user %s', roleToAdd, member.displayName)
    try {
      const roleActual = member.guild.roles.cache.find((role) => role.name == roleToAdd)
      if (!roleActual) {
        throw new Error(`could not find role ${roleToAdd}`)
      }
      await member.roles.add(roleActual, 'They joined and everyone gets this')
    } catch (err) {
      botLogger.error(err, 'could not add "%s" role to member', roleToAdd)
    }
  }
})
// Log our bot in using the token from env variable DISCORD_TOKEN
client.login(config.get('discordToken'))
