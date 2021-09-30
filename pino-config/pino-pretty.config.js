const chalk = require('chalk')

module.exports = {
  messageFormat(log, messageKey, levelLabel) {
    const logParts = []
    logParts.push(chalk.magenta`[${log.module || 'global'}]`)
    if (log.guild) {
      logParts.push(chalk.yellow(`{Guild: ${log.guild}}`))
    }
    logParts.push(log[messageKey])
    return logParts.join(' - ')
  },
  ignore: 'pid,hostname,module,guild',
}
