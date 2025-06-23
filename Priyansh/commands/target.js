const fs = require("fs");
const filePath = __dirname + "/targetUsers.json";

function loadTargets() {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(filePath));
}

function saveTargets(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "target",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "You",
  description: "Target someone to roast when they send a message",
  commandCategory: "fun",
  usages: "/target [uid|remove uid|list]",
  cooldowns: 3
};

// 🔁 Auto Gali System
module.exports.handleEvent = async ({ event, api }) => {
  const { senderID, threadID, messageID } = event;
  const targets = loadTargets();

  if (targets.includes(senderID)) {
    const galis = [
      "Chup be chomu 🤡", "teri ma ka bhosda tu msg mt kr sale!", "teri ma ke sath sex hogya ? 😒",
      "JA ma chuda dimaag mt kharab kr bhen ke lode?", "papa ko gali ni dete MADRXHOD  😑", 
      "chup sale randi ke picllee", "teri ma ki chut faar dunga sale randi ke bche  😂", 
      "teri randi ma ka bhosda faar dunga", "teri ma ka bhosda bhag bhenchod mayank tera baap hai"
    ];

    const gali = galis[Math.floor(Math.random() * galis.length)];
    return api.sendMessage(gali, threadID, messageID);
  }
};

// 🔧 Command: Add/Remove/List
module.exports.run = async ({ event, api, args }) => {
  const { threadID, messageID } = event;
  const targets = loadTargets();

  const subcmd = args[0];
  if (subcmd === "list") {
    return api.sendMessage(
      `🎯 Targeted UIDs:\n${targets.length ? targets.join("\n") : "No one targeted yet."}`,
      threadID, messageID
    );
  }

  const uid = args[1] || args[0];
  if (!uid || isNaN(uid)) return api.sendMessage("⚠️ Provide a valid UID.", threadID, messageID);

  if (subcmd === "remove") {
    if (!targets.includes(uid)) return api.sendMessage("❌ UID not in target list.", threadID, messageID);
    const updated = targets.filter(id => id !== uid);
    saveTargets(updated);
    return api.sendMessage(`✅ Removed UID ${uid} from target list.`, threadID, messageID);
  }

  if (!targets.includes(uid)) {
    targets.push(uid);
    saveTargets(targets);
    return api.sendMessage(`🎯 UID ${uid} added to target list.`, threadID, messageID);
  } else {
    return api.sendMessage("⚠️ UID already in target list.", threadID, messageID);
  }
};
