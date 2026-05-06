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

// Start bot
client.once("ready", () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(TOKEN);

// Start Express server (Railway uses PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`));
