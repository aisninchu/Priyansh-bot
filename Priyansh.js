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

    // ✅ Multi-trigger autorespond
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
            reply: "This bot was created by Priyansh! 😎"
        }
    ],
    npUIDs: new Set()
};

global.utils = require("./utils");
global.nodemodule = {};
global.config = {};
global.configModule = {};
global.moduleData = [];
global.language = {};

// LOAD CONFIG
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

// LOAD LANGUAGE
const langFile = readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, "utf8").split(/\r?\n|\r/);
for (const item of langFile) {
    if (item.startsWith('#') || item === '') continue;
    const [itemKey, itemValue] = item.split('=');
    const head = itemKey.slice(0, itemKey.indexOf('.'));
    const key = itemKey.replace(`${head}.`, '');
    if (!global.language[head]) global.language[head] = {};
    global.language[head][key] = itemValue.replace(/\\n/g, '\n');
}
global.getText = function (...args) {
    const langText = global.language;
    if (!langText.hasOwnProperty(args[0])) throw `Language key not found: ${args[0]}`;
    let text = langText[args[0]][args[1]];
    for (let i = args.length - 1; i > 1; i--) text = text.replace(RegExp(`%${i}`, 'g'), args[i]);
    return text;
};

// APPSTATE LOAD
let appState;
try {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    appState = require(appStateFile);
    logger.loader(global.getText("priyansh", "foundPathAppstate"));
} catch {
    logger.loader(global.getText("priyansh", "notFoundPathAppstate"), "error");
    process.exit(1);
}

// OWNER UID LIST
const OWNER_UIDS = global.config.OWNER_UIDS || ["61571633498434"];
const npFilePath = join(global.client.mainPath, "np.txt");

// ✅ MAIN BOT
login({ appState }, async (err, api) => {
    if (err) return logger("❌ Login Failed", "error");

    logger("✅ Login successful! Starting bot...");

    api.listenMqtt(async (err, event) => {
        if (err || !event.body || !event.senderID) return;

        const senderID = event.senderID;
        const threadID = event.threadID;
        const messageID = event.messageID;
        const body = event.body.trim();
        const lowerBody = body.toLowerCase();

        // ✅ Multi-trigger autorespond (everyone can use)
        for (const { triggers, reply } of global.data.autoResponds) {
            if (triggers.some(trigger => lowerBody.includes(trigger))) {
                return api.sendMessage(reply, threadID, messageID);
            }
        }

        // ✅ Target UID random reply from np.txt
        if (global.data.npUIDs.has(senderID)) {
            if (existsSync(npFilePath)) {
                const lines = readFileSync(npFilePath, "utf8").split(/\r?\n/).filter(Boolean);
                if (lines.length > 0) {
                    const randomReply = lines[Math.floor(Math.random() * lines.length)];
                    return api.sendMessage(randomReply, threadID, messageID);
                }
            }
        }

        // ✅ OWNER COMMANDS
        if (body.startsWith("!")) {
            if (!OWNER_UIDS.includes(senderID)) return;

            const args = body.slice(1).trim().split(/\s+/);
            const command = args.shift().toLowerCase();

            switch (command) {
                case "ping":
                    return api.sendMessage("pong ✅", threadID, messageID);

                case "hello":
                    return api.sendMessage("Hello Owner 😎", threadID, messageID);

                case "help":
                    return api.sendMessage(
                        `🛠 Available Commands:
• !ping
• !hello
• !help
• !loopmsg <message>
• !stoploop
• !time
• !npadd <uid>
• !npremove <uid>
• !nplist`, threadID, messageID);

                case "loopmsg":
                    const loopMessage = args.join(" ");
                    if (!loopMessage) return api.sendMessage("❌ Usage: !loopmsg <message>", threadID, messageID);
                    if (global.data.loopInterval)
                        return api.sendMessage("⚠️ Loop already running! Use !stoploop.", threadID, messageID);
                    api.sendMessage(`🔁 Loop started. Sending every 15s.\nUse !stoploop to stop.`, threadID);
                    global.data.loopInterval = setInterval(() => {
                        api.sendMessage(loopMessage, threadID);
                    }, 15000);
                    return;

                case "stoploop":
                    if (!global.data.loopInterval)
                        return api.sendMessage("⚠️ No active loop.", threadID, messageID);
                    clearInterval(global.data.loopInterval);
                    global.data.loopInterval = null;
                    return api.sendMessage("🛑 Loop stopped.", threadID, messageID);

                case "time":
                    const now = new Date();
                    const timeString = now.toLocaleTimeString("en-IN", { hour12: true });
                    return api.sendMessage(`🕒 Current time is: ${timeString}`, threadID, messageID);

                case "npadd":
                    const uidToAdd = args[0];
                    if (!uidToAdd || isNaN(uidToAdd)) return api.sendMessage("❌ Usage: !npadd <uid>", threadID, messageID);
                    global.data.npUIDs.add(uidToAdd);
                    return api.sendMessage(`✅ UID ${uidToAdd} added to NP list.`, threadID, messageID);

                case "npremove":
                    const uidToRemove = args[0];
                    if (!uidToRemove || isNaN(uidToRemove)) return api.sendMessage("❌ Usage: !npremove <uid>", threadID, messageID);
                    if (!global.data.npUIDs.has(uidToRemove)) return api.sendMessage("⚠️ UID not found in list.", threadID, messageID);
                    global.data.npUIDs.delete(uidToRemove);
                    return api.sendMessage(`✅ UID ${uidToRemove} removed from NP list.`, threadID, messageID);

                case "nplist":
                    if (global.data.npUIDs.size === 0) return api.sendMessage("📭 NP list is empty.", threadID, messageID);
                    return api.sendMessage(`📋 NP UIDs:\n${[...global.data.npUIDs].join("\n")}`, threadID, messageID);

                default:
                    return api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
            }
        }
    });
});
