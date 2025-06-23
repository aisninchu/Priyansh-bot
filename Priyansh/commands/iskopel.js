const fs = require("fs");
const path = require("path");

let isRunning = {};

module.exports.config = {
  name: "iskopel",
  version: "6.0.0",
  hasPermssion: 2,
  credits: "You",
  description: "Loop np.txt messages endlessly",
  commandCategory: "tools",
  usages: "/iskopel [delay] [prefix] | stop",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;
  const filePath = path.resolve("modules/commands/np.txt");

  // Stop loop
  if (args[0] === "stop") {
    if (isRunning[threadID]) {
      isRunning[threadID] = false;
      return api.sendMessage("🛑 Loop stopped for this group.", threadID);
    } else {
      return api.sendMessage("⚠️ No loop running in this group.", threadID);
    }
  }

  // Ensure np.txt exists
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "Edit this np.txt\nAdd your custom lines here.");
    return api.sendMessage("📄 Created np.txt. Please add your messages inside it.", threadID);
  }

  // Read np.txt
  const messages = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (messages.length === 0) {
    return api.sendMessage("⚠️ np.txt is empty. Please add some lines.", threadID);
  }

  // Parse delay and prefix
  let delay = 1000;
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

  // Infinite loop of np.txt messages
  while (isRunning[threadID]) {
    for (const line of messages) {
      if (!isRunning[threadID]) break;
      const msg = `${prefix}${line}`;
      await new Promise(res => setTimeout(res, delay));
      api.sendMessage(msg, threadID);
    }
    // After one full cycle, loop continues automatically
  }
};
