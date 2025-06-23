const fs = require("fs");
const path = require("path");

let isRunning = {}; // thread-wise loop tracker

module.exports.config = {
  name: "iskopel",
  version: "4.0.0",
  hasPermssion: 2, // only bot owner
  credits: "You",
  description: "Loop np.txt messages endlessly until stopped",
  commandCategory: "tools",
  usages: "/iskopel [delay] [prefix] | stop",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;

  // Path to np.txt relative to bot root
  const filePath = path.resolve("modules/commands/np.txt");

  // Stop loop command
  if (args[0] === "stop") {
    if (isRunning[threadID]) {
      isRunning[threadID] = false;
      return api.sendMessage("🛑 Loop stopped successfully.", threadID);
    } else {
      return api.sendMessage("⚠️ No loop is currently running in this group.", threadID);
    }
  }

  // Create np.txt if not found
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "Hello!\nThis is your np.txt.\nEdit and save your own messages.");
    return api.sendMessage("📝 np.txt created. Please edit it with your own messages.", threadID);
  }

  // Read and clean messages
  const messages = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (messages.length === 0) {
    return api.sendMessage("⚠️ np.txt is empty. Please add some messages.", threadID);
  }

  // Optional: delay and prefix
  let delay = 1000; // default 1 sec
  let prefix = "";

  if (args.length > 0) {
    const d = parseInt(args[0]);
    if (!isNaN(d)) delay = d * 1000;

    if (args.length > 1) {
      prefix = args.slice(1).join(" ") + " ";
    }
  }

  // Start loop
  isRunning[threadID] = true;
  api.sendMessage(`✅ Loop started.\n⏱ Delay: ${delay / 1000}s\n🔖 Prefix: ${prefix || "(none)"}`, threadID);

  // Endless message loop
  while (isRunning[threadID]) {
    for (const line of messages) {
      if (!isRunning[threadID]) break;
      const msg = `${prefix}${line}`;
      await new Promise(res => setTimeout(res, delay));
      api.sendMessage(msg, threadID);
    }
  }

  // Loop finished
  isRunning[threadID] = false;
};
