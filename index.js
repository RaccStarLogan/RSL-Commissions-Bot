import express from "express";
import bodyParser from "body-parser";
import { Client, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import crypto from "crypto";

// Load environment variables from Railway
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const OWNER_ID = process.env.DISCORD_USER_ID;

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// Create Express server
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST client for sending messages
const rest = new REST({ version: "10" }).setToken(TOKEN);

// Receive commission from Cloudflare
app.post("/commission", async (req, res) => {
    try {
        console.log("Recieved commission:", req.body);
        const data = req.body;

        const commissionId = crypto.randomUUID();

        const message = [
            `# New ${data.source} Commission Request`,
            `**Name:** ${data.name}`,
            `**Contact:** ${data.contactMethod} — ${data.contactDetails}`,
            `**Category:** ${data.category}`,
            `**Type:** ${data.type || "N/A"}`,
            ``,
            `**Add-ons:**`,
            `Extra Characters: ${data.addons.extraChars ? data.addons.extraCharCount : "No"}`,
            `Background: ${data.addons.background ? "Yes" : "No"}`,
            `Sequential: ${data.addons.sequential ? data.addons.sequentialCount : "No"}`,
            `Animation: ${data.addons.animation ? "Yes" : "No"}`,
            `Commercial: ${data.addons.commercial ? "Yes" : "No"}`,
            `Rush: ${data.addons.rush ? data.addons.rushDeadline : "No"}`,
            ``,
            `**Details:**`,
            `${data.details}`,
            ``,
            `**References:**`,
            `${data.references}`,
            ``,
            `**Payment:** ${data.paymentMethod} — ${data.paymentEmail}`,
            `**Subtotal:**`,
            `# $${data.subtotal}`
        ].join("\n");

        const dmChannel = await rest.post(Routes.userChannels(), {
            body: { recipient_id: OWNER_ID }
        });

        console.log("OWNER_ID:", OWNER_ID);

        await rest.post(Routes.channelMessages(dmChannel.id), {
            body: {
                content: message,
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 3,
                                label: "Accept",
                                custom_id: `accept_${commissionId}_${data.name}`
                            },
                            {
                                type: 2,
                                style: 4,
                                label: "Decline",
                                custom_id: `decline_${commissionId}_${data.name}`
                            }
                        ]
                    }
                ]
            }
        });

        res.json({ ok: true });
    } catch (err) {
        console.error("Commission error", err);
        res.status(500).json({ error: err.message });
    }
});

// Handle Accept/Decline buttons
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    const [action, commissionId, ...nameParts] = interaction.customId.split("_");
    const name = nameParts.join("_");

    if (action === "accept") {
        await interaction.message.edit({
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: "Accept",
                            custom_id: `accept_${commissionId}_${name}`,
                            disabled: true
                        },
                        {
                            type: 2,
                            style: 4,
                            label: "Decline",
                            custom_id: `decline_${commissionId}_${name}`,
                            disabled: true
                        }
                    ]
                }
            ]
        })
        await interaction.reply({
            content: `Commission from **${name}** accepted! Please contact the client to proceed.`,
            ephemeral: false
        });
    }

    if (action === "decline") {
        await interaction.message.delete();
        await interaction.reply({
            content: `Commission from **${name}** declined.`,
            ephemeral: true
        });
    }
});

// Make custom statuses to cycle through
// NOTE TO SELF:
//  Type        Number
//  Playing     0
//  Streaming   1
//  Listening   2
//  Watching    3
//  Custom      4 <-- this is kind of undocumented so idk
//  Competing   5 <-- i've never seen this in practice...
const statuses = [
    { name: "your commissions 👀", type: 3 },
    { name: "Logan VS Backend Dev", type: 2 },
    { name: "the queue fill up", type: 3 },
    { name: "Please Don't Crash", type: 0 },
    { name: "commission ideas", type: 2 },
    { name: "REDRIFT", type: 3 },
    { name: "Logan try to be normal", type: 3 },
    { name: "Jesper's guitar playing", type: 2 },
    { name: "Jesper on a mission", type: 3 },
    { name: "Jason… unfortunately", type: 2 },
    { name: "Wyvern's weird music taste", type: 2 },
    { name: "Azrian cook for Zeke", type: 3 },
    { name: "Judas from afar", type: 3 },
]

// Start bot
client.once("ready", () => {
    console.log(`Bot logged in as ${client.user.tag}`);

    setInterval(() => {
        const s = statuses[Math.floor(Math.random() * statuses.length)];
        client.user.setPresence({ activities: [s], status: "online" });
    }, 30_000);
});

client.login(TOKEN);

// Start Express server (Railway uses PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`));
