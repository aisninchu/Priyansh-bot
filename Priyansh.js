const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, rm } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const chalk = require('chalk');
const logger = require("./utils/log.js");
const login = require("fca-priyansh");
const axios = require("axios");

console.log(chalk.bold.hex("#00ffff")("[ PRIYANSH RAJPUT (PRIYANSH) ] » ") + chalk.bold.hex("#00ffff")("Initializing variables..."));

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
    allThreadID: []
};

global.utils = require("./utils");
global.nodemodule = {};
global.config = {};
global.configModule = {};
global.moduleData = [];
global.language = {};

// CONFIG LOAD
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

// LANGUAGE LOAD
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

// OWNER UIDs
const OWNER_UIDS = global.config.OWNER_UIDS || ["61571633498434", "", ""];

// LOGIN AND LISTEN
login({ appState }, async (err, api) => {
    if (err) return logger("❌ Login Failed", "error");

    logger("✅ Login successful! Starting bot...");

    // Simple message handler
    api.listenMqtt(async (err, event) => {
        if (err || !event.body || !event.senderID) return;

        const senderID = event.senderID;
        const threadID = event.threadID;
        const messageID = event.messageID;
        const body = event.body.trim();

        // 🔒 Ignore if not owner
        if (!OWNER_UIDS.includes(senderID)) return;

        // 🔹 Process command (starting with "!")
        if (body.startsWith("!")) {
            const args = body.slice(1).trim().split(/\s+/);
            const command = args.shift().toLowerCase();

            switch (command) {
                case "ping":
                    return api.sendMessage("pong ✅", threadID, messageID);

                case "hello":
                    return api.sendMessage("Hello Owner 😎", threadID, messageID);

                case "help":
                    return api.sendMessage(
                        `🛠 Available Commands:\n• !ping\n• !hello\n• !help`,
                        threadID,
                        messageID
                    );

                default:
                    return api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
            }
        }
    });
});
