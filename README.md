Discord Bot for voice only text chat
====================================
This is a bot that simply watches your server and will add and remove roles to those in the voice channels. If the roles are set up correctly, this will give the appearance of a text channel appearing and disappearing for those in the voice channel.

How to setup discord
--------------------
1. Go to https://discord.com/developers/applications and make a new application.
2. Add a bot this new application you have made. Give it a fun name and picture and whatever.
3. Disable this being a public bot if you want. Also, if you want to use the auto-assign role feature, or the detection of temporary server members, then enable the "Server Members Intent" feature.
4. Copy the token off this page and store it somewhere secure. (It is the password to your bot, anyone who has it can do anything the bot can). You need to provide this value to the server config field `discordToken` when you run it.
5. Go to the OAuth2 page and click the "bot" scope and the "Manage Roles" and "View Channels" permissions. Go to the link the page has generated and then add the bot to your server.
6. Add roles to your server titled "currently-in-voice-channel" or "currently-in-voice-channel-name-of-voice-channel".
Make some text channels that are only visible to people with those roles. Optionally deny "Read Message History" this role to make the text chat ephemeral.
Make sure the roles you have made are lower than the bot in the roles list.

How to run
----------
There are numerous ways to run a discord bot. There are some guides on how to do this here: https://anidiots.guide/hosting. Some of these might require compiling the typescript to host it.
I use docker to host the bot on my own server. An example `docker-compose.yml` file is included.

Config
------
The app can be configured through either some json files stored in the `config` directory or some environment variables.

### Json Files
The name of json files can either be `{NODE_ENV}.json` (eg. `production.json`) or `local.json`. These values will all be merged. Precedence is environment variables are highest, then `local.json` then `{NODE_ENV}.json` then the default values.

### Config Options
|Field|Environment|Description|Format|Default|
|-|-|-|-|-|
|env|NODE_ENV|The application environment.|production,development,test|development|
|magicRoleName|MAGIC_ROLE|Name of the role that discord assigns when joining voice channel. This field is always stripped of case and any non-alpha characters.|case-insensitive-and-alpha-only|currentlyinvoicechannel|
|discordToken|DISCORD_TOKEN|Discord bot token.|string||
|logLevel|LOG_LEVEL|Level of logs to print to stdout.|fatal,error,warn,info,debug,trace|debug|
|logLevelDiscord|LOG_LEVEL_DISCORD|Level of logs to print to stdout for the discord library components.|fatal,error,warn,info,debug,trace|info|
|autoAssignedRole|AUTO_ASSIGNED_ROLE|Role that everyone that joins gets assigned.|string (nullable)||
|dontAddRolesToTemporaryMembers|DONT_ADD_ROLES_TO_TEMP|Prevents from adding roles to members that we assume are temporary. Temporary members become permanent if they have roles, so we need to do this. However this is significant overhead and it is also a bit of guesswork.|boolean|true|
|inviteDeleteWaitTimeMs|INVITE_DELETE_WAIT_TIME|Time to wait after an invite is deleted before deleting it from cache. This delay allows determining which invite was used on use join events.|nat|500|

How to read the logs
--------------------
The application logs with a json format. You need to pipe the logs from the application through the pino formatter. A preset config for this is in this repository. So if you clone this repo and `npm install` and then pipe the logs through the script like this: `docker logs bot | npm run formatLogs`.
Or you just global install pino-pretty `npm i -g pino-pretty` and pipe everything through that `docker logs bot | pino-pretty`.
Or you can use a different tool like [jog](https://github.com/qiangyt/jog).

FAQ
---
### Can different servers have different roles names or settings?
No, that would require persistent storage and thats too much scope for this.
### Why are logs so weird?
I felt like teaching myself about weird logging.
### Why is there a default role assign feature?
I give everyone in my server admin, and I need to do this for the private chat to work.