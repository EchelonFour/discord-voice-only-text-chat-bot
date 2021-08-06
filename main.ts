
import { Client, Intents } from 'discord.js'

import config from './config.js'
import globalLogger from './logger.js'
import { wait } from './util.js'

import { calculateRoleDifference } from './roleCalculations.js'
import { determineIfTemporaryInviteUsedAndUpdateInviteCache } from './inviteCalculations.js'
import { InviteCache, TemporaryMemberCache } from './cache.js'
import { setUpDiscordLoggerListener } from './discordLogger.js'

import './init.js'
const logger = globalLogger.child({ module: 'bot' })

const inviteCache = new InviteCache()
const temporaryMembers = new TemporaryMemberCache()

const clientIntents = [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES]
if (config.get('autoAssignedRole') || config.get('dontAddRolesToTemporaryMembers')) {
  logger.info('Also listening on members joining or leaving')
  clientIntents.push(Intents.FLAGS.GUILD_MEMBERS)
}
if (config.get('dontAddRolesToTemporaryMembers')) {
  logger.info('Also listening for invites')
  clientIntents.push(Intents.FLAGS.GUILD_INVITES)
}

const client = new Client({
  ws: {
    intents: clientIntents
  },
  presence: {
    activity: {
      name: 'whos in the voice chat',
      type: 'WATCHING'
    }
  }
})
setUpDiscordLoggerListener(client)

client.on('ready', async () => {
  logger.debug({ guilds: client.guilds.cache.map((guild) => guild.name) }, 'shard is dealing with guilds')
  for (const guild of client.guilds.cache.values()) {
    const guildInvites = await inviteCache.fetchAndCache(guild)
    logger.debug('found %d invites for guild %s', guildInvites.size, guild.name)
  }
  logger.info('Ready')
})
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.channelID == newState.channelID) {
    logger.trace('user muted or defeaned or whatever. dont care')
    return
  }
  const member = oldState.member || newState.member
  logger.info(`voiceStateUpdate event with user ${member?.displayName} going from ${oldState.channel?.name} to ${newState.channel?.name}`)
  if (member && config.get('dontAddRolesToTemporaryMembers') && temporaryMembers.has(member)) {
    logger.info({ member }, 'this user is only temporary, so we cant add roles to them')
    return
  }
  try {
    const roles = calculateRoleDifference(oldState.channel, newState.channel)
    if (roles[0]?.size && oldState.member) { // something to be deleted
      logger.debug(`${oldState.member.displayName} removed from roles ${roles[0].map(role => role.name).join(', ')}`)
      await oldState.member.roles.remove(roles[0], `They left the ${oldState.channel!.name} voice channel`)
    }
    if (roles[1]?.size && newState.member) { // something to be added
      logger.debug(`${newState.member.displayName} added to roles ${roles[1].map(role => role.name).join(', ')}`)
      await newState.member.roles.add(roles[1], `They joined the ${newState.channel!.name} voice channel`)
    }
  } catch (err) {
    logger.error(err, 'failed to mess with roles')
  }

})

client.on('guildMemberAdd', async (member) => {
  logger.info({ member }, 'guildMemberAdd event fired')
  const roleToAdd = config.get('autoAssignedRole')
  let shouldAddRole = !!roleToAdd
  if (shouldAddRole && config.get('dontAddRolesToTemporaryMembers'))  {
    const temporary = await determineIfTemporaryInviteUsedAndUpdateInviteCache(member.guild, inviteCache)
    if (temporary) {
      logger.info('new user is only temporary')
      shouldAddRole = false
      temporaryMembers.addToCache(member)
    }
  }
  if (shouldAddRole) {
    logger.debug('adding role "%s" to user %s', roleToAdd, member.displayName)
    try {
      const roleActual = member.guild.roles.cache.find((role) => role.name == roleToAdd)
      if (!roleActual) {
        throw new Error(`could not find role ${roleToAdd}`)
      }
      await member.roles.add(roleActual, 'They joined and everyone gets this')
    } catch (err) {
      logger.error(err, 'could not add "%s" role to member', roleToAdd)
    }
  }
})
client.on('guildMemberRemove', (member) => {
  logger.info({ member }, 'guildMemberRemove event fired')
  temporaryMembers.deleteFromCache(member)
})
client.on('inviteCreate', async (invite) => {
  logger.debug({ invite }, 'new invite')
  await inviteCache.gate.workFast(invite.guild, async () => {
    inviteCache.addToCache(invite)
  })
})
client.on('inviteDelete', async (invite) => {
  await wait(config.get('inviteDeleteWaitTimeMs')) // we wait a little before deleting them, so if they were deleted by a user add event, we have time to see that
  logger.debug({ invite }, 'deleted invite')
  await inviteCache.gate.workSlow(invite.guild, async () => {
    inviteCache.deleteFromCache(invite)
  })
})
// Log our bot in using the token from env variable DISCORD_TOKEN
client.login(config.get('discordToken'))
