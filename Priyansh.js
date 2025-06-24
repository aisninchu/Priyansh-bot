const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const chalk = require('chalk');
const logger = require("./utils/log.js");
const login = require("fca-priyansh");

console.log(chalk.bold.hex("#00ffff")("[ PRIYANSH BOT ] » ") + chalk.bold.hex("#00ffff")("Starting..."));

// GLOBAL SETUP
global.client = {
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: [],
    handleSchedule: [],
    handleReaction: [],
    handleReply: [],
    mainPath: process.cwd(),
    configPath: ""
};

global.data = {
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: [],
    allUserID: [],
    allCurrenciesID: [],
    allThreadID: [],
    loopInterval: null,
    npUIDs: [],
    groupNameLocks: {},
    autoResponds: [
        {
            triggers: ["hello bot", "hi bot", "yo bot"],
            reply: "Hi there! 🤖"
        },
        {
            triggers: ["how are you", "what's up"],
            reply: "I'm just code, but doing great! 😄"
        },
        {
            triggers: ["bye", "goodbye"],
            reply: "Goodbye! Have a nice day! 👋"
        },
        {
            triggers: ["who are you", "your name"],
            reply: "I'm your friendly assistant bot. 😊"
        },
        {
            triggers: ["owner", "bot creator"],
            reply: "This bot was created by mayank! 😎"
        }
    ]
};

global.utils = require("./utils");
global.nodemodule = {};
global.config = {};
global.configModule = {};
global.moduleData = [];
global.language = {};

try {
    global.client.configPath = join(global.client.mainPath, "config.json");
    const configRaw = existsSync(global.client.configPath)
        ? require(global.client.configPath)
        : JSON.parse(readFileSync(global.client.configPath + ".temp", 'utf8'));
    for (const key in configRaw) global.config[key] = configRaw[key];
    logger.loader("✅ Config Loaded!");
    writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');
} catch (e) {
    logger.loader("❌ config.json not found or failed to load!", "error");
    process.exit(1);
}

let appState;
try {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    appState = require(appStateFile);
    logger.loader("✅ Appstate Loaded!");
} catch {
    logger.loader("❌ Appstate not found!", "error");
    process.exit(1);
}

const OWNER_UIDS = global.config.OWNER_UIDS || ["61571633498434"];

login({ appState }, async (err, api) => {
    if (err) return logger("❌ Login Failed", "error");

    logger("✅ Login successful! Starting bot...");

    // 🛡 Background check for group name lock
    setInterval(() => {
        for (const threadID in global.data.groupNameLocks) {
            const lockedName = global.data.groupNameLocks[threadID];
            api.getThreadInfo(threadID, (err, info) => {
                if (!err && info.threadName !== lockedName) {
                    api.setTitle(lockedName, threadID); // silent reset
                }
            });
        }
    }, 5000); // Check every 5 seconds

    api.listenMqtt(async (err, event) => {
        if (err || !event.body || !event.senderID) return;

        const senderID = event.senderID;
        const threadID = event.threadID;
        const messageID = event.messageID;
        const body = event.body.trim();
        const lowerBody = body.toLowerCase();

        if (global.data.npUIDs.includes(senderID)) {
            try {
                const lines = readFileSync("np.txt", "utf-8").split(/\r?\n/).filter(line => line.trim() !== "");
                const randomLine = lines[Math.floor(Math.random() * lines.length)];
                if (randomLine) api.sendMessage(randomLine, threadID);
            } catch {}
        }

        for (const { triggers, reply } of global.data.autoResponds) {
            if (triggers.some(trigger => lowerBody.includes(trigger))) {
                return api.sendMessage(reply, threadID, messageID);
            }
        }

        if (body.startsWith("!")) {
            const args = body.slice(1).trim().split(/\s+/);
            const command = args.shift().toLowerCase();

            if (!OWNER_UIDS.includes(senderID)) return;

            switch (command) {
                case "ping":
                    return api.sendMessage("pong ✅", threadID, messageID);

                case "hello":
                    return api.sendMessage("Hello Owner 😎", threadID, messageID);

                case "help":
                    return api.sendMessage(`🛠 Available Commands:\n• !ping\n• !hello\n• !help\n• !loopmsg <message>\n• !stoploop\n• !npadd <uid>\n• !npremove <uid>\n• !nplist\n• !groupnamelock <name|off>\n• !nickall <nickname>`, threadID, messageID);

                case "loopmsg": {
                    const loopMessage = args.join(" ");
                    if (!loopMessage) return api.sendMessage("❌ Usage: !loopmsg <message>", threadID, messageID);
                    if (global.data.loopInterval)
                        return api.sendMessage("⚠️ Loop already running! Use !stoploop.", threadID, messageID);
                    api.sendMessage(`🔁 Loop started. Sending every 15s.\nUse !stoploop to stop.`, threadID);
                    global.data.loopInterval = setInterval(() => {
                        api.sendMessage(loopMessage, threadID);
                    }, 15000);
                    return;
                }

                case "stoploop":
                    if (!global.data.loopInterval)
                        return api.sendMessage("⚠️ No active loop.", threadID, messageID);
                    clearInterval(global.data.loopInterval);
                    global.data.loopInterval = null;
                    return api.sendMessage("🛑 Loop stopped.", threadID, messageID);

                case "npadd": {
                    const uid = args[0];
                    if (!uid) return api.sendMessage("❌ Usage: !npadd <uid>", threadID, messageID);
                    if (!global.data.npUIDs.includes(uid)) {
                        global.data.npUIDs.push(uid);
                        return api.sendMessage(`✅ UID ${uid} added to NP list.`, threadID, messageID);
                    } else return api.sendMessage("⚠️ UID already exists in NP list.", threadID, messageID);
                }

                case "npremove": {
                    const uid = args[0];
                    if (!uid) return api.sendMessage("❌ Usage: !npremove <uid>", threadID, messageID);
                    global.data.npUIDs = global.data.npUIDs.filter(u => u !== uid);
                    return api.sendMessage(`✅ UID ${uid} removed from NP list.`, threadID, messageID);
                }

                case "nplist":
                    return api.sendMessage(`📋 NP UIDs:\n${global.data.npUIDs.join("\n") || "(none)"}`, threadID, messageID);

                case "groupnamelock": {
                    const groupName = args.join(" ");
                    if (!groupName) return api.sendMessage("❌ Usage: !groupnamelock <name|off>", threadID, messageID);
                    if (groupName.toLowerCase() === "off") {
                        delete global.data.groupNameLocks[threadID];
                        return api.sendMessage("🔓 Group name lock disabled.", threadID, messageID);
                    }
                    global.data.groupNameLocks[threadID] = groupName;
                    api.setTitle(groupName, threadID); // Initial lock immediately
                    return api.sendMessage(`🔒 Group name locked to: ${groupName}`, threadID, messageID);
                }

                case "nickall": {
                    const newNick = args.join(" ");
                    if (!newNick) return api.sendMessage("❌ Usage: !nickall <nickname>", threadID, messageID);
                    api.getThreadInfo(threadID, async (err, info) => {
                        if (err) return api.sendMessage("❌ Failed to get thread info.", threadID, messageID);
                        const members = info.participantIDs.filter(id => id !== api.getCurrentUserID());
                        api.sendMessage(`🔁 Changing nicknames of ${members.length} members to \"${newNick}\" (3s delay)...`, threadID);
                        for (let i = 0; i < members.length; i++) {
                            const userID = members[i];
                            setTimeout(() => {
                                api.changeNickname(newNick, threadID, userID, err => {
                                    if (err) console.log(`❌ Failed for UID: ${userID}`);
                                });
                            }, i * 3000);
                        }
                    });
                    return;
                }

                default:
                    return api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
            }
        }
    });
});
