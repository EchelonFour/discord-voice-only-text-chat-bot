import { Client, GuildMember, Intents, Invite, VoiceState } from 'discord.js'

import config from './config.js'
import globalLogger from './logger.js'
import { wait } from './util.js'

import { calculateRoleDifference } from './roleCalculations.js'
import { determineIfTemporaryInviteUsedAndUpdateInviteCache } from './invite-calculations.js'
import { InviteCache } from './cache/InviteCache'
import { TemporaryMemberCache } from './cache/TemporaryMemberCache'
import { setUpDiscordLoggerListener } from './discord-logger.js'

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
    intents: clientIntents,
  },
  presence: {
    activity: {
      name: "who's in the voice chat",
      type: 'WATCHING',
    },
  },
})
setUpDiscordLoggerListener(client)

async function readyAsync(): Promise<void> {
  logger.debug({ guilds: client.guilds.cache.map((guild) => guild.name) }, 'shard is dealing with guilds')
  const fetchAllInviteCaches = client.guilds.cache.mapValues(async (guild) => {
    const guildInvites = await inviteCache.fetchAndCache(guild)
    logger.child({ guild: guild.id }).debug('found %d invites for guild %s', guildInvites.size, guild.name)
  })
  await Promise.all(fetchAllInviteCaches)
  logger.info('Ready')
}

client.on('ready', () => {
  // eslint-disable-next-line promise/prefer-await-to-callbacks, promise/prefer-await-to-then
  readyAsync().catch((error) => logger.error(error, 'error when client readying up'))
})

async function voiceStateUpdateAsync(oldState: VoiceState, newState: VoiceState): Promise<void> {
  if (oldState.channelID === newState.channelID) {
    logger.trace('user muted or deafened or whatever. dont care')
    return
  }
  const member = oldState.member || newState.member
  const guildLogger = logger.child({ guild: (oldState || newState)?.guild?.id })
  guildLogger.info(
    `voiceStateUpdate event with user %s going from %s to %s`,
    member?.displayName,
    oldState.channel?.name,
    newState.channel?.name,
  )
  if (member && config.get('dontAddRolesToTemporaryMembers') && temporaryMembers.has(member)) {
    guildLogger.info({ member }, 'this user is only temporary, so we cant add roles to them')
    return
  }
  try {
    const roles = calculateRoleDifference(oldState.channel, newState.channel)
    if (roles[0]?.size && oldState.member) {
      // something to be deleted
      guildLogger.debug(
        `${oldState.member.displayName} removed from roles ${roles[0].map((role) => role.name).join(', ')}`,
      )
      await oldState.member.roles.remove(roles[0], `They left the ${oldState.channel!.name} voice channel`)
    }
    if (roles[1]?.size && newState.member) {
      // something to be added
      guildLogger.debug(`${newState.member.displayName} added to roles ${roles[1].map((role) => role.name).join(', ')}`)
      await newState.member.roles.add(roles[1], `They joined the ${newState.channel!.name} voice channel`)
    }
  } catch (error) {
    guildLogger.error(error as Error, 'failed to mess with roles')
  }
}
client.on('voiceStateUpdate', (oldState, newState) => {
  // eslint-disable-next-line promise/prefer-await-to-callbacks, promise/prefer-await-to-then
  voiceStateUpdateAsync(oldState, newState).catch((error) =>
    logger.error(error, 'error when client processing voice state update'),
  )
})

async function guildMemberAddAsync(member: GuildMember): Promise<void> {
  const guildLogger = logger.child({ guild: member?.guild?.id })
  guildLogger.info({ member }, 'guildMemberAdd event fired')
  const roleToAdd = config.get('autoAssignedRole')
  let shouldAddRole = !!roleToAdd
  if (shouldAddRole && config.get('dontAddRolesToTemporaryMembers')) {
    const temporary = await determineIfTemporaryInviteUsedAndUpdateInviteCache(member.guild, inviteCache)
    if (temporary) {
      guildLogger.info('new user is only temporary')
      shouldAddRole = false
      temporaryMembers.addToCache(member)
    }
  }
  if (shouldAddRole) {
    guildLogger.debug('adding role "%s" to user %s', roleToAdd, member.displayName)
    try {
      const roleActual = member.guild.roles.cache.find((role) => role.name == roleToAdd)
      if (!roleActual) {
        throw new Error(`could not find role ${roleToAdd}`)
      }
      await member.roles.add(roleActual, 'They joined and everyone gets this')
    } catch (error) {
      guildLogger.error(error as Error, 'could not add "%s" role to member', roleToAdd)
    }
  }
}

client.on('guildMemberAdd', (member) => {
  // eslint-disable-next-line promise/prefer-await-to-callbacks, promise/prefer-await-to-then
  guildMemberAddAsync(member).catch((error) => logger.error(error, 'error when client processing guild member add'))
})
client.on('guildMemberRemove', (member) => {
  const guildLogger = logger.child({ guild: member?.guild?.id })
  guildLogger.info({ member }, 'guildMemberRemove event fired')
  temporaryMembers.deleteFromCache(member)
})

async function inviteCreateAsync(invite: Invite): Promise<void> {
  const guildLogger = logger.child({ guild: invite?.guild?.id })
  guildLogger.debug({ invite }, 'new invite')
  await inviteCache.gate.workFast(invite.guild, () => {
    inviteCache.addToCache(invite)
    return Promise.resolve()
  })
}

client.on('inviteCreate', (invite) => {
  // eslint-disable-next-line promise/prefer-await-to-callbacks, promise/prefer-await-to-then
  inviteCreateAsync(invite).catch((error) => logger.error(error, 'error when client processing invite create'))
})

async function inviteDeleteAsync(invite: Invite): Promise<void> {
  const guildLogger = logger.child({ guild: invite?.guild?.id })
  await wait(config.get('inviteDeleteWaitTimeMs')) // we wait a little before deleting them, so if they were deleted by a user add event, we have time to see that
  guildLogger.debug({ invite }, 'deleted invite')
  await inviteCache.gate.workSlow(invite.guild, () => {
    inviteCache.deleteFromCache(invite)
    return Promise.resolve()
  })
}

client.on('inviteDelete', (invite) => {
  // eslint-disable-next-line promise/prefer-await-to-callbacks, promise/prefer-await-to-then
  inviteDeleteAsync(invite).catch((error) => logger.error(error, 'error when client processing invite create'))
})
// Log our bot in using the token from env variable DISCORD_TOKEN
void client.login(config.get('discordToken'))
