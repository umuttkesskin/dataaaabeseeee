const { Client, Collection, Intents } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const { MessageEmbed } = require("discord.js");
const client = global.client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_PRESENCES,
  ]
});
const dotenv = require("dotenv");
dotenv.config();
const { readdir } = require("fs");
const config = require("./config")
const moment = require("moment");
moment.locale("tr");
require("moment-duration-format");
const db = require("quick.db");
const commands = client.commands = new Collection();
const aliases = client.aliases = new Collection();
client.cooldown = new Map();
client.commandblocked = [];


let danger = true

client.on("rateLimit", function (RateLimitData) {
    console.log("RATE LIMIT WARN!", RateLimitData)
})

client.on("ready", () => {
    client.user.setPresence({ activity: { name: (config.bot.status), type: "PLAYING" }, status: "online" });
    if (danger) console.log("Danger mod aktif!")
    if (danger !== true) {
        RoleBackup()
        setInterval(() => {
            RoleBackup()
        }, 1000 * 60 * 60);//? 1 saatte bir alır süreyi değiştirebilirsiniz (1000 = 1 saniye)
    }
});

client.on("message", message => {
    let prefix = config.bot.prefix.find((x) => message.content.toLowerCase().startsWith(x));
    if (!config.bot.owners.includes(message.author.id) || !prefix || !message.guild) return;
    let args = message.content.split(' ').slice(1);
    let command = message.content.split(' ')[0].slice(prefix.length);

    if (command === "backup-al") {
        RoleBackup();
        message.reply({ content: `Anlık olarak veri tabanına sunucu rol verisini **başarıyla** kaydettiniz.`}) 
    }

    if (command === "eval") {
        if (!args[0]) return message.reply({ content: `Öncelikle geçerli bir kod belirtmelisin!`}) 
        let code = args.join(' ');
        function clean(text) {
            if (typeof text !== 'string') text = require('util').inspect(text, { depth: 0 })
            text = text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203))
            return text;
        };
        try {
            var evaled = clean(eval(code));
            if (evaled.match(new RegExp(`${client.token}`, 'g'))) evaled.replace(client.token, "Yasaklı komut");
            message.channel.send(`${evaled.replace(client.token, "Njk2MTY4Nz8SDIFDU4OTA1MDk4.b4nug3rc3k.bir.t0k3ns4n4cak.kadarsalagim")}`, { code: "js", split: true });
        } catch (err) { message.channel.send(err, { code: "js", split: true }) };
    };

    if (command === "backup-kur") {
        const ıd = args[0]
            if (!ıd) return message.reply({ content: `Öncelikle geçerli bir Rol ID'si belirtmelisin!`}) 
        const RoleDatabase = db.get(`rolebackup_${message.guild.id}_${ıd}`);
      if (!RoleDatabase) return message.reply({ content: `Öncelikle geçerli bir Rol idsi belirtmelisin!`}) 
        const RoleMembers = db.get(`rolemembers_${message.guild.id}_${ıd}`)
        message.guild.roles.create({
            data: {
                name: RoleDatabase.name,
                color: RoleDatabase.color,
                hoist: RoleDatabase.hoist,
                position: RoleDatabase.position,
                permissions: RoleDatabase.permler,
            }
        }).then(newRole => {
            message.reply({ content: `Sunucuda başarıyla **(${newRole.id})** rolünün datasını kurdunuz.`}) 
            client.channels.cache.get(config.channels.logchannel).send({ content: `🔔 Sunucuda ${message.author} tarafından ${newRole.name} (${newRole.id}) rolü'nün datası kuruldu!`}) 
            if (!RoleMembers) return console.log(`${newRole.name} olayında veri tabanına kayıtlı kullanıcı olmadığı için rol dağıtımı iptal edildi!`)
            RoleMembers.forEach(member => {
                if (!member) return console.log(`${member.user.username} kullanıcısını sunucuda bulamadığım için ${newRole.name} rolü verilemedi!`)
                message.guild.members.cache.get(member).roles.add(newRole.id).then(x => console.log(`${client.users.cache.get(member).username} kullanıcısı ${newRole.name} rolünü aldı!`)).catch(err => console.log(`${err} sebebiyle ${client.users.cache.get(member).username} kullanıcısı ${newRole.name} rolünü alamadı!`))
            })
        })


    }
})

async function RoleBackup() {
    client.guilds.cache.get(config.Guild.GuildID).roles.cache.filter(e => !e.managed).forEach(async role => {
        db.set(`rolebackup_${role.guild.id}_${role.id}`, {
            name: role.name,
            color: role.hexColor,
            hoist: role.hoist,
            position: role.rawPosition,
            permler: role.permissions,
            mentionable: role.mentionable,
        })
        db.set(`rolemembers_${role.guild.id}_${role.id}`, role.members.map(e => e.id))
    })
    let rolsize = client.guilds.cache.get(config.Guild.GuildID).roles.cache.filter(rls => rls.name !== "@everyone").size
    console.log(`${moment(Date.now()).format("LLL")} Tarihinde başarıyla ${rolsize} rolün data alma işlemi gerçekleştirildi.`)
}

client.on("roleDelete", role => {
    client.channels.cache.get(config.channels.logchannel).send({ content: `Hey! <@&${config.Guild.OwnerRole}> sunucuda \`${role.name}\` - \`${role.id}\` rolü silindi.
Rolün datasını kurmak isterseniz: \`!backup-kur ${role.id}\` komudunu uygulayabilirsiniz.`}) 
})

client.login("OTQ5OTc4MjA4Mzc0MjQzMzU4.YiSOJg.F9mnkwaP4BbXf4EiYgsIM7y9wXo").then(x => console.log(`Bot ${client.user.username} olarak giriş yaptı.`)).catch(err => console.log(`Bot giriş yapamadı! Sebep: ${err}`));

client.on('voiceStateUpdate', async (___, newState) => {
    //---SELFDEAF
    if(
        newState.member.user.bot &&
        newState.channelID &&
        newState.member.user.id == client.user.id && !newState.selfDeaf
    ) return newState.setSelfDeaf(true);
  
   //---SELFMUTE
    if(
        newState.member.user.bot &&
        newState.channelID &&
        newState.member.user.id == client.user.id && !newState.selfMute
    ) return newState.setSelfMute(true);
  })