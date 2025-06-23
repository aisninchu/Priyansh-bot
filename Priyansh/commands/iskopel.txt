const fs = require("fs");
const path = require("path");

let isRunning = {}; // store running status per thread

module.exports.config = {
  name: "iskopel",
  version: "3.0.0",
  hasPermssion: 2,
  credits: "You",
  description: "Loop np.txt messages in group, with stop and delay/prefix",
  commandCategory: "tools",
  usages: "/iskopel [delay] [prefix] | stop",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;
  const filePath = path.join(__dirname, "np.txt");

  // Handle /iskopel stop
  if (args[0] === "stop") {
    if (isRunning[threadID]) {
      isRunning[threadID] = false;
      return api.sendMessage("🛑 iskopel loop stopped!", threadID);
    } else {
      return api.sendMessage("⚠️ No loop is running.", threadID);
    }
  }

  // Check if np.txt exists
  if (!fs.existsSync(filePath)) {
    return api.sendMessage("❌ np.txt not found!", threadID);
  }

  const messages = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(m => m.trim())
    .filter(m => m.length > 0);

  if (messages.length === 0) {
    return api.sendMessage("⚠️ np.txt is empty.", threadID);
  }

  // Optional args: delay and prefix
  let delay = 1000;
  let prefix = "";

  if (args.length > 0) {
    const d = parseInt(args[0]);
    if (!isNaN(d)) delay = d * 1000;
    if (args.length > 1) prefix = args.slice(1).join(" ") + " ";
  }

  isRunning[threadID] = true;
  api.sendMessage(`🚀 Sending ${messages.length} messages...\n⏱ Delay: ${delay / 1000}s\n🔖 Prefix: ${prefix || "(none)"}`, threadID);

  for (let i = 0; i < messages.length; i++) {
    if (!isRunning[threadID]) break;

    const msg = `${prefix}${messages[i]}`;
    await new Promise(res => setTimeout(res, delay));
    api.sendMessage(msg, threadID);
  }

  if (isRunning[threadID]) {
    api.sendMessage("✅ All messages sent!", threadID);
  }

  isRunning[threadID] = false;
};
