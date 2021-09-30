import convict from 'convict'
import { existsSync } from 'fs'

convict.addFormat({
  name: 'case-insensitive-and-alpha-only',
  validate(val) {
    if (typeof val !== 'string') {
      throw new TypeError('must be a string')
    }
    if (val === '') {
      throw new TypeError('must not be empty')
    }
  },
  coerce(val) {
    return typeof val === 'string' ? val.toLowerCase().replace(/[^a-z]/g, '') : val
  },
})

export const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  magicRoleName: {
    doc: 'Name of the role that discord assigns when joining voice channel. This field is always stripped of case and any non-alpha characters.',
    format: 'case-insensitive-and-alpha-only',
    default: 'currentlyinvoicechannel',
    env: 'MAGIC_ROLE',
  },
  discordToken: {
    doc: 'Discord bot token.',
    format: String,
    default: null as unknown as string,
    env: 'DISCORD_TOKEN',
    sensitive: true,
  },
  logLevel: {
    doc: 'Level of logs to print to stdout.',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    default: 'debug' as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',
    env: 'LOG_LEVEL',
  },
  logLevelDiscord: {
    doc: 'Level of logs to print to stdout for the discord library components.',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    default: 'info' as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',
    env: 'LOG_LEVEL_DISCORD',
  },
  autoAssignedRole: {
    doc: 'Role that everyone that joins gets assigned.',
    format: String,
    default: null as string | null,
    env: 'AUTO_ASSIGNED_ROLE',
    nullable: true,
  },
  dontAddRolesToTemporaryMembers: {
    doc: 'Prevents from adding roles to members that we assume are temporary. Temporary members become permanent if they have roles, so we need to do this. However this is significant overhead and it is also a bit of guesswork.',
    format: Boolean,
    default: true,
    env: 'DONT_ADD_ROLES_TO_TEMP',
  },
  inviteDeleteWaitTimeMs: {
    doc: 'Time to wait after an invite is deleted before deleting it from cache. This delay allows determining which invite was used on use join events.',
    format: 'nat',
    default: 500,
    env: 'INVITE_DELETE_WAIT_TIME',
  },
})
const env = config.get('env')
const filesToLoad = [`./config/${env}.json`, `./config/local.json`]
for (const file of filesToLoad) {
  if (existsSync(file)) {
    config.loadFile(file)
  }
}

export default config
