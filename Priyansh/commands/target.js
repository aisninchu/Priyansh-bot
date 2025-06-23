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
  version: "2.0.0",
  hasPermssion: 2,
  credits: "You",
  description: "Target users to roast when they message",
  commandCategory: "fun",
  usages: "/target [add/remove/list] [uid1 uid2 uid3...]",
  cooldowns: 3
};

// 🔁 Auto Roast on Message
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

// 🔧 Command handler
module.exports.run = async ({ event, api, args }) => {
  const { threadID, messageID } = event;
  const targets = loadTargets();

  const subcmd = args[0]?.toLowerCase();
  const ids = args.slice(1).filter(id => !isNaN(id));

  if (subcmd === "list") {
    return api.sendMessage(
      `🎯 Targeted UIDs:\n${targets.length ? targets.join("\n") : "No one targeted yet."}`,
      threadID, messageID
    );
  }

  if (subcmd === "add") {
    if (!ids.length) return api.sendMessage("⚠️ Provide at least one UID to add.", threadID, messageID);
    let added = [];

    for (const uid of ids) {
      if (!targets.includes(uid)) {
        targets.push(uid);
        added.push(uid);
      }
    }

    saveTargets(targets);
    return api.sendMessage(
      `✅ Added: ${added.length ? added.join(", ") : "No new UID (already added)."}`,
      threadID, messageID
    );
  }

  if (subcmd === "remove") {
    if (!ids.length) return api.sendMessage("⚠️ Provide at least one UID to remove.", threadID, messageID);
    let removed = [];

    for (const uid of ids) {
      if (targets.includes(uid)) {
        removed.push(uid);
      }
    }

    const updated = targets.filter(uid => !removed.includes(uid));
    saveTargets(updated);

    return api.sendMessage(
      `🗑 Removed: ${removed.length ? removed.join(", ") : "No matching UID found."}`,
      threadID, messageID
    );
  }

  return api.sendMessage("❌ Invalid usage. Use `/target add/remove/list [uid]`", threadID, messageID);
};
