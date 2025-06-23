const fs = require("fs");
const path = require("path");

let isRunning = {}; // thread-wise loop status

module.exports.config = {
  name: "iskopel",
  version: "3.0.1",
  hasPermssion: 2, // only dev
  credits: "You",
  description: "Loop messages from np.txt with delay and prefix options",
  commandCategory: "tools",
  usages: "/iskopel [delay] [prefix] | stop",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;

  // Set the path to np.txt relative to bot root
  const filePath = path.resolve("Priyansh/commands/np.txt");

  // Stop loop if requested
  if (args[0] === "stop") {
    if (isRunning[threadID]) {
      isRunning[threadID] = false;
      return api.sendMessage("🛑 iskopel loop stopped.", threadID);
    } else {
      return api.sendMessage("⚠️ No loop is running right now.", threadID);
    }
  }

  // If np.txt doesn't exist, create it and inform user
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "Hello there!\nThis is np.txt\nEdit this file to your own messages.");
    return api.sendMessage("📝 np.txt was not found, so it has been created. Please edit it with your custom messages.", threadID);
  }

  // Read all non-empty lines
  const messages = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (messages.length === 0) {
    return api.sendMessage("⚠️ np.txt is empty. Add some messages.", threadID);
  }

  // Read optional delay and prefix
  let delay = 1000; // default: 1 sec
  let prefix = "";

  if (args.length > 0) {
    const d = parseInt(args[0]);
    if (!isNaN(d)) delay = d * 1000;

    if (args.length > 1) {
      prefix = args.slice(1).join(" ") + " ";
    }
  }

  // Mark loop running
  isRunning[threadID] = true;
  api.sendMessage(`🚀 Started message loop.\n⏱ Delay: ${delay / 1000}s\n🔖 Prefix: ${prefix || "(none)"}`, threadID);

  for (const line of messages) {
    if (!isRunning[threadID]) break;

    const msg = `${prefix}${line}`;
    await new Promise(res => setTimeout(res, delay));
    api.sendMessage(msg, threadID);
  }

  if (isRunning[threadID]) {
    api.sendMessage("✅ All messages sent from np.txt.", threadID);
  }

  isRunning[threadID] = false;
};
