require('dotenv').config()
const dialogflow = require('@google-cloud/dialogflow')
const { ShardClient } = require('detritus-client')
const sessions = new Map()

const client = new ShardClient(process.env.BOT_TOKEN)

client.on('messageCreate', async ({ message }) => {
  const channelWhitelist = process.env.CHANNEL_WHITELIST.split(',')
  if (!message.author.bot && message.guildId && channelWhitelist.includes(message.channelId) && message.member.roles.size === 0) {
    console.log(`Trying to respond to msg ${message.id}...`)
    if (!sessions.has(message.channelId)) {
      sessions.set(message.channelId, new dialogflow.SessionsClient())
    }
    const dfclient = sessions.get(message.channelId)
    const response = await dfclient.detectIntent({
      session: dfclient.projectAgentSessionPath(process.env.PROJECT_ID, message.channelId),
      queryInput: {
        text: {
          text: message.content,
          languageCode: 'en-US'
        }
      }
    })
    const result = response[0].queryResult
    if (result.fulfillmentText) {
      await message.channel.triggerTyping()
      await (require('util').promisify(setTimeout))(1000)
      // no detritius support for replies yet, so improvise
      await client.rest.request({
        method: 'POST',
        url: `https://discord.com/api/v8/channels/${message.channelId}/messages`,
        body: {
          content: result.fulfillmentText,
          message_reference: {
            channel_id: message.channelId,
            guild_id: message.guild.id,
            message_id: message.id
          }
        }
      })
    }
  }
});

(async () => {
  await client.run()
  console.log('Successfully connected to Discord!')
})()
