
import { Client, GuildMember, Intents, Collection, Invite, Guild } from 'discord.js'


import config from './config.js'
import logger from './logger.js'
import { wait } from './util.js'

import { calculateRoleDifference } from './roleCalculations.js'
import { determineIfTemporaryInviteUsedAndUpdateInviteCache } from './inviteCalculations.js'

import './init.js'
import { InviteCache, TemporaryMemberCache } from './cache.js'
const botLogger = logger.child({ module: 'bot' })


const clientIntents = [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES]
if (config.get('autoAssignedRole') || config.get('dontAddRolesToTemporaryMembers')) {
  botLogger.info('Also listening on members joining or leaving')
  clientIntents.push(Intents.FLAGS.GUILD_MEMBERS)
}
if (config.get('dontAddRolesToTemporaryMembers')) {
  botLogger.info('Also listening for invites')
  clientIntents.push(Intents.FLAGS.GUILD_INVITES)
}

const inviteCache = new InviteCache()
const temporaryMembers = new TemporaryMemberCache()
const client = new Client({
  ws: {
    intents: clientIntents
  }
});
client.on('ready', async () => {
  botLogger.debug({ guilds: client.guilds.cache.map((guild) => guild.name) }, 'shard is dealing with guilds')
  for (const guild of client.guilds.cache.values()) {
    const guildInvites = await inviteCache.fetchAndCache(guild)
    botLogger.debug('found %d invites for guild %s', guildInvites.size, guild.name)
  }
  botLogger.info('Ready')
})
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.channelID == newState.channelID) {
    botLogger.trace('user muted or defeaned or whatever. dont care')
    return
  }
  const member = oldState.member || newState.member
  botLogger.info(`voiceStateUpdate event with user ${member?.displayName} going from ${oldState.channel?.name} to ${newState.channel?.name}`)
  if (member && config.get('dontAddRolesToTemporaryMembers') && temporaryMembers.has(member)) {
    botLogger.info({ member }, 'this user is only temporary, so we cant add roles to them')
    return
  }
  try {
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
  botLogger.info({ member }, 'guildMemberAdd event fired')
  const roleToAdd = config.get('autoAssignedRole')
  let shouldAddRole = !!roleToAdd
  if (shouldAddRole && config.get('dontAddRolesToTemporaryMembers'))  {
    const temporary = await determineIfTemporaryInviteUsedAndUpdateInviteCache(member.guild, inviteCache)
    if (temporary) {
      shouldAddRole = false
      temporaryMembers.addToCache(member)
    }
  }
  if (shouldAddRole) {
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
client.on('guildMemberRemove', (member) => {
  botLogger.info({ member }, 'guildMemberRemove event fired')
  temporaryMembers.deleteFromCache(member)
})
client.on('inviteCreate', (invite) => {
  botLogger.debug({ invite }, 'new invite')
  inviteCache.addToCache(invite)
})
client.on('inviteDelete', async (invite) => {
  await wait(config.get('inviteDeleteWaitTimeMs')) // we wait a little before deleting them, so if they were deleted by a user add event, we have time to see that
  botLogger.debug({ invite }, 'deleted invite')
  inviteCache.deleteFromCache(invite)
})
// Log our bot in using the token from env variable DISCORD_TOKEN
client.login(config.get('discordToken'))
