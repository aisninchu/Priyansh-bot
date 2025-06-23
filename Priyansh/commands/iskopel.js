const fs = require("fs");
const path = require("path");

let isRunning = {}; // Track loop status per group (threadID)

module.exports.config = {
  name: "iskopel",
  version: "5.0.0",
  hasPermssion: 2, // Only bot owner
  credits: "You",
  description: "Loop np.txt messages in all groups independently",
  commandCategory: "tools",
  usages: "/iskopel [delay] [prefix] | stop",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;

  const filePath = path.resolve("modules/commands/np.txt");

  // 🛑 STOP Command
  if (args[0] === "stop") {
    if (isRunning[threadID]) {
      isRunning[threadID] = false;
      return api.sendMessage("🛑 Loop stopped for this group.", threadID);
    } else {
      return api.sendMessage("⚠️ No active loop in this group.", threadID);
    }
  }

  // 📝 Auto-create np.txt if missing
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "Edit this np.txt with your custom lines.\nAdd multiple lines as messages.");
    return api.sendMessage("📄 Created np.txt. Please edit it with your own messages.", threadID);
  }

  // 📚 Read lines from np.txt
  const messages = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (messages.length === 0) {
    return api.sendMessage("⚠️ np.txt is empty. Please add messages.", threadID);
  }

  // ⏱️ Delay (default: 1s)
  let delay = 1000;
  let prefix = "";

  if (args.length > 0) {
    const d = parseInt(args[0]);
    if (!isNaN(d)) delay = d * 1000;
    if (args.length > 1) prefix = args.slice(1).join(" ") + " ";
  }

  // 🚀 Start Loop
  isRunning[threadID] = true;
  api.sendMessage(`✅ Loop started.\n⏱ Delay: ${delay / 1000}s\n🔖 Prefix: ${prefix || "(none)"}`, threadID);

  // 🔁 Endless Loop Until Stopped
  while (isRunning[threadID]) {
    for (const line of messages) {
      if (!isRunning[threadID]) break;
      const msg = `${prefix}${line}`;
      await new Promise(res => setTimeout(res, delay));
      api.sendMessage(msg, threadID);
    }
  }

  // 🔕 Loop stopped manually
  // Don't send "msg end" anymore
};
