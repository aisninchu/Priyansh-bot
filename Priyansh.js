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
    loopIntervals: {},
    mkcIntervals: {},
    mkcIndexes: {},
    npUIDs: [],
    groupNameLocks: {},
    autoResponds: [
        { triggers: ["hello bot", "hi bot", "yo bot"], reply: "Hi there! 🤖" },
        { triggers: ["how are you", "what's up"], reply: "I'm just code, but doing great! 😄" },
        { triggers: ["bye", "goodbye"], reply: "Goodbye! Have a nice day! 👋" },
        { triggers: ["who are you", "your name"], reply: "I'm your friendly assistant bot. 😊" },
        { triggers: ["owner", "bot creator"], reply: "This bot was created by mayank! 😎" }
    ],
    targetMode: true,
    targetUIDs: []
};

function loadTargetUIDs() {
    try {
        const content = readFileSync("target.txt", "utf-8")
            .split(/\r?\n/)
            .map(x => x.trim())
            .filter(x => x !== "");
        global.data.targetUIDs = content;
        console.log(chalk.green(`🎯 Loaded ${content.length} target UIDs.`));
    } catch (e) {
        global.data.targetUIDs = [];
        console.log(chalk.red("❌ Failed to load target.txt"));
    }
}

loadTargetUIDs();

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

const OWNER_UIDS = global.config.OWNER_UIDS || ["61571633498434", "100062775577009", "100081506784272", "100074745969481"];

login({ appState }, async (err, api) => {
    if (err) return logger("❌ Login Failed", "error");

    logger("✅ Login successful! Starting bot...");

    setInterval(() => {
        for (const threadID in global.data.groupNameLocks) {
            const lockedName = global.data.groupNameLocks[threadID];
            api.getThreadInfo(threadID, (err, info) => {
                if (!err && info.threadName !== lockedName) {
                    api.setTitle(lockedName, threadID);
                }
            });
        }
    }, 5000);

    api.listenMqtt(async (err, event) => {
        if (err || !event.body || !event.senderID) return;

        const senderID = event.senderID;
        const threadID = event.threadID;
        const messageID = event.messageID;
        const body = event.body.trim();
        const lowerBody = body.toLowerCase();

        // 🎯 Target Mode Logic
        if (global.data.targetMode && global.data.targetUIDs.includes(senderID)) {
            try {
                const lines = readFileSync("no.txt", "utf-8")
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(line => line !== "");
                if (lines.length > 0) {
                    const randomLine = lines[Math.floor(Math.random() * lines.length)];
                    return api.sendMessage(randomLine, threadID, messageID);
                }
            } catch (err) {
                console.log(chalk.red("❌ Failed to read no.txt"), err);
            }
        }

        if (global.data.npUIDs.includes(senderID)) {
            try {
                const lines = readFileSync("np.txt", "utf-8").split(/\r?\n/).filter(line => line.trim() !== "");
                const randomLine = lines[Math.floor(Math.random() * lines.length)];
                if (randomLine) api.sendMessage({ body: randomLine }, threadID, messageID);
            } catch {}
        }
        // 🔁 Enhanced Auto-Response Logic with Fuzzy Matching
const normalize = (text) =>
    text.toLowerCase()
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/[^a-z\s]/g, ''); // remove non-letter characters

const dedupeLetters = (text) =>
    text.replace(/(.)\1{2,}/g, '$1'); // reduce repeated letters to one

const levenshtein = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return dp[a.length][b.length];
};

const similarity = (a, b) => {
    const distance = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : (1 - distance / maxLen);
};

const SIMILARITY_THRESHOLD = 0.65;
const LEVENSHTEIN_THRESHOLD = 3;

const normalizedBody = dedupeLetters(normalize(lowerBody));

for (const { triggers, reply } of global.data.autoResponds) {
    for (const trigger of triggers) {
        const normalizedTrigger = dedupeLetters(normalize(trigger));
        if (
            normalizedBody.includes(normalizedTrigger) ||
            levenshtein(normalizedBody, normalizedTrigger) <= LEVENSHTEIN_THRESHOLD ||
            similarity(normalizedBody, normalizedTrigger) >= SIMILARITY_THRESHOLD
        ) {
            return api.sendMessage(reply, threadID, messageID);
        }
    }
}        
        // ✅ Admin-only Auto Response (without touching existing auto-response logic)
api.getThreadInfo(threadID, (err, info) => {
    if (err) return;

    const isAdmin = info.adminIDs.some(admin => admin.id === senderID);
    if (!isAdmin) return;

    const msg = lowerBody;

    if (msg.includes("sena pati")) {
        return api.sendMessage("🫡Kya hua maharaj kiski ma chodni hai batao abhi chod deta hun 🙋🏻🙇🏻", threadID, messageID);
    }

    if (msg.includes("kaisi hai")) {
        return api.sendMessage("arey iski ma ek number ki randi hai sale ki ma ka bhosda bhi kala hai🤮😒 ", threadID, messageID);
    }

    if (msg.includes("jai ho")) {
        return api.sendMessage("jai ho jai ho🙋🏻😂", threadID, messageID);
    }
});

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
                    return api.sendMessage(`🛠 Available Commands:
• !ping
• !hello
• !help
• !loopmsg <message>
• !stoploop
• !npadd <uid>
• !npremove <uid>
• !nplist
• !groupnamelock <name|off>
• !nickall <nickname>
• !mkc <prefix> | <seconds>
• !stopmkc
• !targetstart`, threadID, messageID);
case "uid": {
    // Check if user mentioned someone
    const mentions = event.mentions;
    if (args[0] === "all") {
        api.getThreadInfo(threadID, (err, info) => {
            if (err) return api.sendMessage("❌ Error fetching group info.", threadID, messageID);
            const list = info.participantIDs.map(id => `• ${id}`).join("\n");
            return api.sendMessage(`👥 Group Member UIDs:\n${list}`, threadID, messageID);
        });
        return;
    }

    if (Object.keys(mentions).length > 0) {
        const reply = Object.entries(mentions).map(([uid, name]) => `${name}: ${uid}`).join("\n");
        return api.sendMessage(`📌 Mentioned UID(s):\n${reply}`, threadID, messageID);
    }

    return api.sendMessage("❌ Usage:\n• !uid @mention\n• !uid all", threadID, messageID);
                    }
             case "groupid":
                     return api.sendMessage(`kya hua mayank bhai kisi ka maa chodani hai kya group id mangrahe ho:\n${threadID}`, threadID, messageID);   

                case "loopmsg": {
                    const loopMessage = args.join(" ");
                    if (!loopMessage) return api.sendMessage("❌ Usage: !loopmsg <message>", threadID, messageID);
                    if (global.data.loopIntervals[threadID]) return api.sendMessage("⚠️ Loop already running in this thread! Use !stoploop.", threadID, messageID);
                    api.sendMessage(`🔁 Loop started in this thread. Sending every 15s.\nUse !stoploop to stop.`, threadID);
                    global.data.loopIntervals[threadID] = setInterval(() => {
                        api.sendMessage(loopMessage, threadID);
                    }, 15000);
                    return;
                }

                case "stoploop":
                    if (!global.data.loopIntervals[threadID]) return api.sendMessage("⚠️ No active loop in this thread.", threadID, messageID);
                    clearInterval(global.data.loopIntervals[threadID]);
                    delete global.data.loopIntervals[threadID];
                    return api.sendMessage("🛑 Loop stopped in this thread.", threadID, messageID);

                case "mkc": {
                    const input = args.join(" ").split("|").map(x => x.trim());
                    if (input.length !== 2) return api.sendMessage("❌ Usage: !mkc <prefix> | <seconds>", threadID, messageID);
                    const prefix = input[0];
                    const intervalSec = parseInt(input[1]);
                    if (isNaN(intervalSec) || intervalSec < 1) return api.sendMessage("❌ Invalid seconds. Example: !mkc Rajeev 😒 | 5", threadID, messageID);
                    let lines;
                    try {
                        lines = readFileSync("msg.txt", "utf-8").split(/\r?\n/).filter(line => line.trim() !== "");
                    } catch {
                        return api.sendMessage("❌ msg.txt file not found!", threadID, messageID);
                    }
                    if (global.data.mkcIntervals[threadID]) return api.sendMessage("⚠️ MKC loop already running in this thread! Use !stopmkc.", threadID, messageID);
                    api.sendMessage(`🔁 MKC loop started with prefix: "${prefix}" and ${intervalSec}s delay.\nUse !stopmkc to stop.`, threadID);
                    global.data.mkcIndexes[threadID] = 0;
                    global.data.mkcIntervals[threadID] = setInterval(() => {
                        if (global.data.mkcIndexes[threadID] >= lines.length) global.data.mkcIndexes[threadID] = 0;
                        const msg = `${prefix} ${lines[global.data.mkcIndexes[threadID]++]}`;
                        api.sendMessage(msg, threadID);
                    }, intervalSec * 1000);
                    return;
                }

                case "stopmkc":
                    if (!global.data.mkcIntervals[threadID]) return api.sendMessage("⚠️ No MKC loop running in this thread.", threadID, messageID);
                    clearInterval(global.data.mkcIntervals[threadID]);
                    delete global.data.mkcIntervals[threadID];
                    delete global.data.mkcIndexes[threadID];
                    return api.sendMessage("🛑 MKC loop stopped in this thread.", threadID, messageID);

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
                    api.setTitle(groupName, threadID);
                    return api.sendMessage(`🔐 Group name locked to: ${groupName}`, threadID, messageID);
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

                case "targetstart":
                    global.data.targetMode = true;
                    return api.sendMessage("🎯 Target mode activated. Will reply to UIDs listed in target.txt using no.txt", threadID, messageID);

                default:
                    return api.sendMessage(`❌ Unknown command: ${command}`, threadID, messageID);
            }
        }
    });
});
