const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Bot güncellemelerini veya sunucu duyurularını paylaşır.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('current_guild')
        .setDescription('Sadece bu sunucuya duyuru gönderir.')
        .addStringOption(option => option.setName('title').setDescription('Duyuru başlığı').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Duyuru açıklaması').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Duyurunun gideceği kanal (seçilmezse bu kanala atılır)').addChannelTypes(ChannelType.GuildText))
        .addStringOption(option => option.setName('image_url').setDescription('Duyuru görseli (link)'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('all_guilds')
        .setDescription('Botun olduğu TÜM sunuculara (global) duyuru gönderir.')
        .addStringOption(option => option.setName('title').setDescription('Duyuru başlığı').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Duyuru açıklaması').setRequired(true))
        .addStringOption(option => option.setName('image_url').setDescription('Duyuru görseli (link)'))
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description').replace(/\\n/g, '\n'); // Allow manual newlines
    const image = interaction.options.getString('image_url');

    const announceEmbed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(description)
      .setColor('#ffcc00')
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: 'Veyronix Bot Duyuruları', iconURL: client.user.displayAvatarURL() });

    if (image) {
      announceEmbed.setImage(image);
    }

    if (subcommand === 'current_guild') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      
      try {
        await channel.send({ embeds: [announceEmbed] });
        await interaction.reply({ content: `Duyuru başarıyla ${channel} kanalına gönderildi.`, flags: [MessageFlags.Ephemeral] });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Duyuru gönderilirken bir hata oluştu. Kanal izinlerini kontrol edin.', flags: [MessageFlags.Ephemeral] });
      }
    } else if (subcommand === 'all_guilds') {
      // Security Check: Only bot owner should ideally do this or very high admins
      if (interaction.user.id !== process.env.OWNER_ID && interaction.guild.ownerId !== interaction.user.id) {
          return await interaction.reply({ content: 'Bu komutu sadece bot sahibi veya sunucu sahibi (güvenlik nedeniyle) global olarak kullanabilir.', flags: [MessageFlags.Ephemeral] });
      }

      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
      
      let successCount = 0;
      let failCount = 0;

      const guilds = Array.from(client.guilds.cache.values());

      for (const guild of guilds) {
        // Try to find a logical channel: first "announcements", then "news", then "general", then any text channel
        const channel = guild.channels.cache.find(c => 
          (c.name.includes('duyuru') || c.name.includes('announcement') || c.name.includes('news') || c.name.includes('genel') || c.name.includes('general')) && 
          c.type === ChannelType.GuildText
        ) || guild.channels.cache.find(c => c.type === ChannelType.GuildText);

        if (channel) {
          try {
            await channel.send({ embeds: [announceEmbed] });
            successCount++;
          } catch (e) {
            failCount++;
          }
        } else {
          failCount++;
        }
      }

      await interaction.editReply({ content: `Global duyuru tamamlandı.\nBaşarılı: ${successCount}\nBaşarısız: ${failCount}` });
    }
  },
};
