const fs = require("fs");
const path = __dirname + "/customReplies.json";

function loadReplies() {
  if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(path));
}

function saveReplies(data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "customreply",
  version: "1.0.0",
  hasPermssion: 1, // Only admins can set replies
  credits: "Custom by You",
  description: "Add or manage auto custom replies per group",
  commandCategory: "Group Settings",
  usages: "[add/del/list] keyword | reply1, reply2, ...",
  cooldowns: 3
};

// 🧠 Auto reply handler
module.exports.handleEvent = async ({ event, api }) => {
  const { threadID, body } = event;
  if (!body) return;

  const data = loadReplies();
  const group = data[threadID];
  if (!group) return;

  const msg = body.toLowerCase();

  for (const key in group) {
    if (msg.includes(key)) {
      const replies = group[key];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      return api.sendMessage(reply, threadID, event.messageID);
    }
  }
};

// 🛠 Command to add/del/list custom replies
module.exports.run = async ({ event, api, args }) => {
  const { threadID, messageID } = event;
  const data = loadReplies();

  const action = args[0];
  if (!["add", "del", "list"].includes(action))
    return api.sendMessage("Use: add/del/list", threadID, messageID);

  if (action === "list") {
    const group = data[threadID] || {};
    const entries = Object.entries(group)
      .map(([k, v]) => `• ${k} → [${v.length} replies]`)
      .join("\n") || "No custom replies yet.";
    return api.sendMessage(`📄 Custom Replies:\n${entries}`, threadID, messageID);
  }

  const input = args.slice(1).join(" ").split("|");
  const keyword = input[0]?.trim().toLowerCase();
  const replyList = input[1]?.split(",").map(r => r.trim()).filter(Boolean);

  if (!keyword || !replyList?.length)
    return api.sendMessage(`❗ Format: ${this.config.name} add keyword | reply1, reply2`, threadID, messageID);

  if (!data[threadID]) data[threadID] = {};

  if (action === "add") {
    data[threadID][keyword] = replyList;
    saveReplies(data);
    return api.sendMessage(`✅ Added trigger "${keyword}" with ${replyList.length} replies.`, threadID, messageID);
  }

  if (action === "del") {
    if (!data[threadID][keyword]) return api.sendMessage("❌ Trigger not found.", threadID, messageID);
    delete data[threadID][keyword];
    saveReplies(data);
    return api.sendMessage(`🗑️ Deleted trigger "${keyword}".`, threadID, messageID);
  }
};
