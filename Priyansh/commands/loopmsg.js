const loopIntervals = new Map();

module.exports.config = {
  name: "loopmsg",
  version: "1.0.0",
  hasPermssion: 2, // Only for bot owner or admins
  credits: "Priyansh Rajput",
  description: "Send message repeatedly until stopped",
  commandCategory: "tools",
  usages: "[delay(sec)] <text> | stop",
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  // Stop command
  if (args[0] === "stop") {
    if (loopIntervals.has(threadID)) {
      clearInterval(loopIntervals.get(threadID));
      loopIntervals.delete(threadID);
      return api.sendMessage("✅ Loop stopped.", threadID, messageID);
    } else {
      return api.sendMessage("⚠️ No loop is running.", threadID, messageID);
    }
  }

  // Extract delay (optional)
  let delay = 5; // default 5 sec
  let msg = args.join(" ");

  if (!isNaN(args[0])) {
    delay = parseInt(args[0]);
    args.shift();
    msg = args.join(" ");
  }

  if (!msg) return api.sendMessage("⚠️ Provide message to loop.", threadID, messageID);

  // Clear existing loop if any
  if (loopIntervals.has(threadID)) {
    clearInterval(loopIntervals.get(threadID));
    loopIntervals.delete(threadID);
  }

  // Send first message immediately
  api.sendMessage(msg, threadID);

  // Start loop
  const interval = setInterval(() => {
    api.sendMessage(msg, threadID);
  }, delay * 1000);

  loopIntervals.set(threadID, interval);
  return api.sendMessage(`🔁 Loop started. Sending every ${delay} seconds.`, threadID, messageID);
};
