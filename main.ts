
import { Client, GuildMember, Intents, VoiceChannel, Role, Collection } from 'discord.js'

function stripAndLowerCase(string: string): string {
  return string.toLowerCase().replace(/[^a-z]/g, '')
}
function findRolesForVoiceChannel(voiceChannel: VoiceChannel): Collection<string, Role> {
  const magicGeneralRoleName = 'currentlyinvoicechannel'
  const magicVoiceChannelRoleName = `${magicGeneralRoleName}${stripAndLowerCase(voiceChannel.name)}`
  return voiceChannel.guild.roles.cache.filter((role) => {
    const roleName = stripAndLowerCase(role.name)
    return roleName == magicGeneralRoleName || roleName == magicVoiceChannelRoleName
  })
}
async function addUserToTextChat(voiceChannel: VoiceChannel, user: GuildMember) {
  const roles = findRolesForVoiceChannel(voiceChannel)
  console.debug(`[bot] ${user.displayName} added to roles ${roles.map(role => role.name).join(', ')}`)
  try {
    await user.roles.add(roles, `They joined the ${voiceChannel.name} voice channel`)
  } catch (err) {
    console.error('failed to mess with roles', err)
  }
}
async function removeUserFromTextChat(voiceChannel: VoiceChannel, user: GuildMember) {
  const roles = findRolesForVoiceChannel(voiceChannel)
  console.debug(`[bot] ${user.displayName} removed from roles ${roles.map(role => role.name).join(', ')}`)
  try{
    
  } catch (err) {
    console.error('failed to mess with roles', err)
  }
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
  throw new TypeError('user moved from no channel to no channel????')
}

const client = new Client({
  ws: {
    intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILDS]
  }
});
client.on('ready', () => {
  console.log('[bot] Ready')
})
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (oldState.channelID == newState.channelID) {
    console.debug('[bot] user muted or defeaned or whatever. dont care')
    return
  }
  try {
    console.log(`[bot] voiceStateUpdate event with user ${(oldState.member || newState.member)?.displayName} going from ${oldState.channel?.name} to ${newState.channel?.name}`)
    const roles = calculateRoleDifference(oldState.channel, newState.channel)
    if (roles[0]?.size && oldState.member) { // something to be deleted
      console.debug(`[bot] ${oldState.member.displayName} removed from roles ${roles[0].map(role => role.name).join(', ')}`)
      await oldState.member.roles.remove(roles[0], `They left the ${oldState.channel!.name} voice channel`)
    }
    if (roles[1]?.size && newState.member) { // something to be added
      console.debug(`[bot] ${newState.member.displayName} added to roles ${roles[1].map(role => role.name).join(', ')}`)
      await newState.member.roles.add(roles[1], `They joined the ${newState.channel!.name} voice channel`)
    }
  } catch (err) {
    console.error('failed to mess with roles', err)
  }

});
client.on('debug', message => {
  // console.debug('[discord]', message)
})
client.on('error', message => {
  console.error('[discord]', message)
})
client.on('warn', message => {
  console.warn('[discord]', message)
})
client.on('connection', stream => {
  console.warn('[discord] connection', stream)
})
client.on('disconnect', stream => {
  console.warn('[discord] disconnect', stream)
})
// Log our bot in using the token from env variable DISCORD_TOKEN
client.login();
