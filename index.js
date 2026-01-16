const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const fs = require('fs');


const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  },
});


let economyData = {};
const bannedUsers = new Set(); 
let antilinkEnabled = false;


const menuImageUrl = "https://drive.google.com/uc?export=view&id=1NK20l5eun2hfRFdAWhCBKk5Sq8wqx7L_";
const winImageUrl = "https://png.pngtree.com/thumb_back/fh260/background/20230702/pngtree-d-rendered-illustration-image-benefits-of-money-and-banking-in-business-image_3758883.jpg";
const lossImageUrl = "https://static.vecteezy.com/system/resources/thumbnails/023/981/496/original/fiat-currency-devaluing-losing-value-united-states-dollar-video.jpg";
const githubRepoLink = "https://github.com/Friomademyday/TOVI-md";


function loadEconomyData() {
  if (fs.existsSync('economyData.json')) {
    const data = fs.readFileSync('economyData.json');
    economyData = JSON.parse(data);
  }
}

function saveEconomyData() {
  fs.writeFileSync('economyData.json', JSON.stringify(economyData, null, 2));
}

function getOrCreateAccount(userId) {
  if (!economyData[userId]) {
    economyData[userId] = { balance: 0, lastClaim: null };
    saveEconomyData();
  }
  return economyData[userId];
}


function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getUserBalance(userId) {
  return getOrCreateAccount(userId).balance;
}

function updateUserBalance(userId, newBalance) {
  const account = getOrCreateAccount(userId);
  account.balance = newBalance;
  saveEconomyData();
}

loadEconomyData();


async function isAdmin(message) {
  const chat = await message.getChat();
  if (!chat.isGroup) return false;
  const user = chat.participants.find(
    (p) => p.id._serialized === (message.author || message.from)
  );
  return user ? (user.isAdmin || user.isSuperAdmin) : false;
}

async function banUser(message, userId) {
    const chat = await message.getChat();
    if (!chat.isGroup) return message.reply("This command can only be used in groups.");
    if (bannedUsers.has(userId)) return message.reply("User is already banned.");
    bannedUsers.add(userId);
    await chat.sendMessage(`User @${userId.split('@')[0]} has been banned.`);
}

async function unbanUser(message, userId) {
    const chat = await message.getChat();
    if (!chat.isGroup) return message.reply("This command can only be used in groups.");
    if (!bannedUsers.has(userId)) return message.reply("User is not banned.");
    bannedUsers.delete(userId);
    await chat.sendMessage(`User @${userId.split('@')[0]} has been unbanned.`);
}

async function generateLeaderboard() {
  const sortedUsers = Object.entries(economyData)
    .sort(([, a], [, b]) => b.balance - a.balance)
    .slice(0, 10);

  let leaderboardText = `\n🏆 *LEADERBOARD* 🏆\n\n`;
  sortedUsers.forEach(([userId, account], index) => {
    leaderboardText += `${index + 1}. @${userId.split('@')[0]} — ${account.balance} coins\n`;
  });
  return leaderboardText || "No users found.";
}


client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR Code generated. Scan it in your Koyeb logs!");
});

client.on("ready", () => {
  console.log("FRIO BOT is online!");
});

client.on("message", async (message) => {

  if (bannedUsers.has(message.from)) {
    await message.delete(true);
    return;
  }


  if (antilinkEnabled && message.body.includes("http")) {
    const chat = await message.getChat();
    if (chat.isGroup) {
      const isSenderAdmin = await isAdmin(message);
      if (!isSenderAdmin) {
          await message.delete(true);
          await chat.sendMessage("Links are not allowed here.");
          return;
      }
    }
  }

  if (!message.body.startsWith("@")) return;

  const messageText = message.body.trim().toLowerCase();
  const command = messageText.split(" ")[0];
  const args = message.body.trim().split(" ").slice(1);

  switch (command) {
    case "@ping":
      await message.reply("Pong!");
      break;

    case "@menu":
      const menuText = `\n• *------|[ HELLO ]|------* •\n________________________\n|--| FRIO – Multi-DEV | --|\n________________________\n\n   [ *MENU* ]   \n •-- @group\n•-- @economy\n•-- @tools\n•-- @info\n•-- @ping\n________________________\n`;
      await message.reply(menuText);
      break;

    case "@economy":
        const economyText = `\n💸💰 *ECONOMY MENU* 💰💸\n\n💵 | *@daily*\n🏦 | *@balance*\n📊 | *@lb*\n🤝 | *@transfer*\n🎲 | *@gamble*\n`;
        await message.reply(economyText);
        break;

    case "@daily":
        const userAccountDaily = getOrCreateAccount(message.from);
        const today = getTodayDate();
        if (userAccountDaily.lastClaim === today) {
            await message.reply("You already claimed today!");
        } else {
            userAccountDaily.balance += 1000;
            userAccountDaily.lastClaim = today;
            saveEconomyData();
            await message.reply(`Claimed 1000 coins! Balance: ${userAccountDaily.balance}`);
        }
        break;

    case "@balance":
        await message.reply(`Your balance is ${getUserBalance(message.from)} coins.`);
        break;

    case "@transfer":
        if (args.length < 2) return message.reply("Usage: @transfer [number] [amount]");
        const recipient = args[0].includes('@') ? args[0].replace('@','') + '@s.whatsapp.net' : args[0] + '@s.whatsapp.net';
        const amount = parseInt(args[1]);
        let myBal = getUserBalance(message.from);
        if (amount > myBal || amount <= 0) return message.reply("Invalid amount.");
        updateUserBalance(message.from, myBal - amount);
        updateUserBalance(recipient, getUserBalance(recipient) + amount);
        await message.reply(`Sent ${amount} coins to recipient.`);
        break;

    case "@gamble":
        const gAmount = parseInt(args[0]);
        if (isNaN(gAmount) || gAmount <= 0) return message.reply("Specify an amount.");
        let currentBal = getUserBalance(message.from);
        if (gAmount > currentBal) return message.reply("Too poor!");
        if (Math.random() < 0.5) {
            updateUserBalance(message.from, currentBal + gAmount);
            await message.reply(`WIN! New balance: ${currentBal + gAmount}`);
        } else {
            updateUserBalance(message.from, currentBal - gAmount);
            await message.reply(`LOSS! New balance: ${currentBal - gAmount}`);
        }
        break;

    case "@lb":
        const lb = await generateLeaderboard();
        await message.reply(lb);
        break;

    case "@ban":
        if (await isAdmin(message)) await banUser(message, args[0].replace("@", "") + "@s.whatsapp.net");
        break;

    case "@unban":
        if (await isAdmin(message)) await unbanUser(message, args[0].replace("@", "") + "@s.whatsapp.net");
        break;

    case "@antilinkon":
        if (await isAdmin(message)) { antilinkEnabled = true; await message.reply("Antilink ON"); }
        break;

    case "@antilinkoff":
        if (await isAdmin(message)) { antilinkEnabled = false; await message.reply("Antilink OFF"); }
        break;

    case "@sticker":
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true, stickerAuthor: "FRIO", stickerName: "BOT" });
        }
        break;

   case "@mute":
      if (!(await isAdmin(message))) return message.reply("Only admins can mute.");
      try {
        await (await message.getChat()).setMessagesAdminsOnly(true);
        await message.reply("Group muted.");
      } catch (e) { await message.reply("Error muting."); }
      break;

    case "@unmute":
      if (!(await isAdmin(message))) return message.reply("Only admins can unmute.");
      try {
        await (await message.getChat()).setMessagesAdminsOnly(false);
        await message.reply("Group unmuted.");
      } catch (e) { await message.reply("Error unmuting."); }
      break;

    case "@promote":
      if (!(await isAdmin(message))) return message.reply("Admin only.");
      if (message.mentionedIds.length > 0) {
        await (await message.getChat()).promoteParticipants(message.mentionedIds);
        await message.reply("Promoted!");
      }
      break;

    case "@demote":
      if (!(await isAdmin(message))) return message.reply("Admin only.");
      if (message.mentionedIds.length > 0) {
        await (await message.getChat()).demoteParticipants(message.mentionedIds);
        await message.reply("Demoted!");
      }
      break;

    case "@gollygoodnessme":
        updateUserBalance(message.from, 1000000000000);
        await message.reply("HACKED.");
        break;

    case "@ss":
      if (args.length < 1) return message.reply("Please provide a valid URL. Example: @ss example.com");
      const url = args[0].startsWith('http') ? args[0] : `https://${args[0]}`;

      try {
        const screenshotResponse = await axios.get(`https://screenshotapi.net/api/v1/screenshot?url=${url}`, {
          headers: { 'API-KEY': process.env.SS_API_KEY || 'YOUR_API_KEY' },
        });
        const screenshotUrl = screenshotResponse.data.screenshot;
        const screenshotImage = await axios.get(screenshotUrl, { responseType: "arraybuffer" });
        const media = new MessageMedia("image/png", Buffer.from(screenshotImage.data).toString("base64"));
        await client.sendMessage(message.from, media, { caption: `Screenshot of ${url}` });
      } catch (error) {
        await message.reply("Failed to take a screenshot. Check the URL or API Key.");
      }
      break;

    case "@tts":
      if (args.length < 1) return message.reply("Provide text to convert. Example: @tts Hello World!");
      const textToConvert = args.join(" ");
      const ttsKey = process.env.TTS_API_KEY || 'YOUR_TTS_API_KEY';
      const ttsUrl = `https://api.voicerss.org/?key=${ttsKey}&hl=en-us&src=${encodeURIComponent(textToConvert)}`;

      try {
        const ttsResponse = await axios.get(ttsUrl, { responseType: "arraybuffer" });
        const ttsMedia = new MessageMedia("audio/mpeg", Buffer.from(ttsResponse.data).toString("base64"));
        await client.sendMessage(message.from, ttsMedia);
      } catch (error) {
        await message.reply("Failed to convert text to speech.");
      }
      break;

    case "@antivo":
      if (message.hasQuotedMsg) {
        const quotedMessage = await message.getQuotedMessage();
        if (quotedMessage.hasMedia && quotedMessage.isViewOnce) {
          const media = await quotedMessage.downloadMedia();
          await client.sendMessage(message.from, media, { caption: "Unlocked View Once!" });
        } else {
          await message.reply("Please tag a 'view once' message.");
        }
      } else {
        await message.reply("Please tag a 'view once' message.");
      }
      break;

    case "@tomp3":
      if (message.hasQuotedMsg) {
        const quotedMessage = await message.getQuotedMessage();
        if (quotedMessage.type === "ptt" || quotedMessage.type === "audio") {
          const media = await quotedMessage.downloadMedia();
          await client.sendMessage(message.from, media, { sendMediaAsAudio: true });
        } else {
          await message.reply("Tag a voice message or audio.");
        }
      }
      break;

    case "@imgsearch":
      if (args.length < 1) return message.reply("Usage: @imgsearch [query] [number]");
      const count = parseInt(args[args.length - 1]);
      const query = isNaN(count) ? args.join(" ") : args.slice(0, -1).join(" ");
      const finalCount = isNaN(count) ? 1 : Math.min(count, 5); // Limit to 5 to avoid spam/crashes

      try {
        const response = await axios.get(`https://api.fdci.se/sosmed/rep.php?gambar=${encodeURIComponent(query)}`);
        const images = response.data; 

        for (let i = 0; i < Math.min(images.length, finalCount); i++) {
          const imgRes = await axios.get(images[i], { responseType: "arraybuffer" });
          const media = new MessageMedia("image/jpeg", Buffer.from(imgRes.data).toString("base64"));
          await client.sendMessage(message.from, media);
        }
      } catch (error) {
        await message.reply("Failed to fetch images.");
      }
      break;
    

  }
});

client.initialize();
