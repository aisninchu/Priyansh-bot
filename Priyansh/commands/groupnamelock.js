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
  version: "2.0.0",
  hasPermssion: 2,
  credits: "Custom by You",
  description: "Lock custom group name and auto-restore if changed",
  commandCategory: "group admin",
  usages: "/groupnamelock <name | off>",
  cooldowns: 5
};

// 🔁 React on name changes
module.exports.handleEvent = async ({ event, api }) => {
  const { threadID, logMessageType } = event;
  if (logMessageType !== "log:thread-name") return;

  const data = loadData();
  const group = data[threadID];

  if (!group?.enabled || !group.name) return;

  setTimeout(() => {
    api.setTitle(group.name, threadID, err => {
      if (!err) {
        console.log(`↩️ Reverted group name to: ${group.name}`);
      }
    });
  }, 3000); // delay to avoid spam
};

// 🔧 Command handler
module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID } = event;
  const data = loadData();

  if (!args[0]) {
    return api.sendMessage("⚙️ Usage:\n/groupnamelock <name> — to lock name\n/groupnamelock off — to unlock", threadID, messageID);
  }

  const input = args.join(" ");

  if (input.toLowerCase() === "off") {
    if (data[threadID]?.enabled) {
      delete data[threadID];
      saveData(data);
      return api.sendMessage("🔓 Group name lock disabled.", threadID, messageID);
    } else {
      return api.sendMessage("❌ No name lock is active.", threadID, messageID);
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
