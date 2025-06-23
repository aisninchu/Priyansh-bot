const fs = require("fs");
const file = __dirname + "/groupNameLock.json";

function loadData() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(file));
}

function saveData(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "groupnamelock",
  version: "1.0.1",
  hasPermssion: 2, // 🛡 Only Bot Owner
  credits: "ChatGPT & You",
  description: "Lock group name manually via command",
  commandCategory: "group",
  usages: "/groupnamelock <name | off>",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID } = event;
  const data = loadData();

  if (!args[0]) {
    return api.sendMessage("📌 Usage:\n/groupnamelock <name>\n/groupnamelock off", threadID, messageID);
  }

  const threadInfo = await api.getThreadInfo(threadID);
  const botID = api.getCurrentUserID();
  const botIsAdmin = threadInfo.adminIDs.some(e => e.id == botID);

  if (!botIsAdmin) {
    return api.sendMessage("❌ Bot must be admin to lock the name.", threadID, messageID);
  }

  const input = args.join(" ");

  if (input.toLowerCase() === "off") {
    if (data[threadID]) {
      delete data[threadID];
      saveData(data);
      return api.sendMessage("🔓 Group name lock removed.", threadID, messageID);
    } else {
      return api.sendMessage("⚠️ Group name lock not active.", threadID, messageID);
    }
  }

  data[threadID] = {
    enabled: true,
    name: input
  };
  saveData(data);

  api.setTitle(input, threadID, () => {
    return api.sendMessage(`✅ Group name locked to: "${input}"`, threadID, messageID);
  });
};

// ✅ Auto restore group name on name change
module.exports.handleEvent = async ({ event, api }) => {
  if (event.logMessageType !== "log:thread-name") return;

  const { threadID } = event;
  const data = loadData();
  const group = data[threadID];

  if (!group?.enabled || !group.name) return;

  const threadInfo = await api.getThreadInfo(threadID);
  if (threadInfo.threadName !== group.name) {
    // 🔁 Set name back
    api.setTitle(group.name, threadID, (err) => {
      if (!err) {
        console.log(`🔒 Name reset to locked value: ${group.name}`);
      }
    });
  }
};
