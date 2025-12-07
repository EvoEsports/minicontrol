import Plugin from "../index.ts";
import { emotesMap } from "./tmnf_emojis";
import badwords from "./badwords.json";
import { clone, removeColors } from "@core/utils";
import ListWindow from "@core/ui/listwindow.ts";
import Widget from "@core/ui/widget.ts";

const regex: RegExp[] = [];

for (const pattern of badwords) {
    regex.push(new RegExp(`^${pattern}$`));
}

function filterWords(text: string) {
    const phrase = text.split(/\s+/);
    for (const word of phrase) {
        for (const re of regex) {
            if (re.test(word.toLowerCase())) {
                return true;
            }
        }
    }
    return false;
}

export default class Chat extends Plugin {
    pluginEnabled = false;
    publicChatEnabled = true;
    playersDisabled: string[] = [];
    widget: Widget | null = null;

    async onLoad() {
        try {
            this.pluginEnabled = (await tmc.server.call("ChatEnableManualRouting", true, false)) as boolean;
            tmc.server.addListener("Trackmania.PlayerChat", this.onPlayerChat, this);
            tmc.addCommand("//chat", this.cmdChat.bind(this), "Controls chat");
            tmc.settings.register("chat.color", "ff0", null, "Chat: Public chat color");
            tmc.settings.register("chat.badge.admin", "f00", null, "Chat: Admin badge color");
            tmc.settings.register("chat.badge.player", "fff", null, "Chat: Player badge color");
            tmc.settings.register("chat.profanityFilter", true, null, "Chat: Enable profanity filter");

            if (tmc.game.Name === "TmForever") {
                tmc.settings.register(
                    "chat.useEmotes",
                    false,
                    this.toggleWidget.bind(this),
                    "Chat: Enable emote replacements in chat $z(see: $lhttp://bit.ly/Celyans_emotes_sheet$l)",
                );
                tmc.chatCmd.addCommand("/emotes", this.cmdTmfEmotes.bind(this), "Emotes help");
                if (tmc.settings.get("chat.useEmotes")) {
                    this.toggleWidget(true);
                }
            } else {
                tmc.chatCmd.addCommand("/chatformat", async () => {}, "");
            }
        } catch (e: any) {
            this.pluginEnabled = false;
            tmc.cli(`ChatPlugin: ¤error¤ ${e.message}`);
        }
    }

    async onUnload() {
        try {
            await tmc.server.call("ChatEnableManualRouting", false, false);
        } catch (e: any) {
            tmc.chat(e.message);
        }
        tmc.removeCommand("//chat");
        tmc.server.removeListener("Trackmania.PlayerChat", this.onPlayerChat);
        this.pluginEnabled = false;
    }

    async cmdChat(login: string, params: string[]) {
        if (params.length === 0) {
            tmc.chat("¤info¤usage: ¤cmd¤//chat <on/off> ¤info¤ or ¤cmd¤//chat <login> <on/off>");
            return;
        }
        if (params.length === 1 && ["on", "off"].includes(params[0])) {
            this.publicChatEnabled = params[0] === "on";
            tmc.chat(`¤info¤Public chat is ¤white¤${params[0]}`);
            return;
        }
        if (params.length === 2 && ["on", "off"].includes(params[1])) {
            if (params[1] === "on") {
                const index = this.playersDisabled.indexOf(params[0]);
                this.playersDisabled.splice(index, 1);
                tmc.chat(`¤info¤Playerchat for ¤white¤${params[0]} ¤info¤is now ¤white¤on!`, login);
            } else {
                this.playersDisabled.push(params[0]);
                tmc.chat(`¤info¤Playerchat for ¤white¤${params[0]} ¤info¤is now ¤white¤off!`, login);
            }
            return;
        }
        tmc.chat("¤info¤usage: ¤cmd¤//chat <on/off> ¤info¤or ¤cmd¤//chat <login> <on/off>");
    }

    async toggleWidget(enabled: boolean) {
        if (enabled && this.widget === null) {
            this.widget = new Widget("core/plugins/chat/widget.xml.twig");
            this.widget.pos = { x: -160, y: -35, z: 5 };
            this.widget.size = { width: 15, height: 3 };
            this.widget.setOpenAction(this.cmdTmfEmotes.bind(this));
            this.widget.display();
        } else if (!enabled && this.widget !== null) {
            this.widget.destroy();
            this.widget = null;
        }
    }

    async onPlayerChat(data: any) {
        const login = data[1];
        let text = data[2];

        if (!this.pluginEnabled) return;
        if (!this.publicChatEnabled && !tmc.admins.includes(login)) {
            tmc.chat("Public chat is disabled.", login);
            return;
        }
        if (data[0] === 0) return;
        if (data[2].startsWith("/")) return;
        if (this.playersDisabled.includes(login)) {
            tmc.chat("Your chat is disabled.", login);
            return;
        }
        if (tmc.settings.get("chat.profanityFilter") && filterWords(removeColors(text))) {
            tmc.chat("¤gray¤$iPlease be respectful!", login);
            return;
        }
        const player = await tmc.getPlayer(login);
        const nick = (player.customNick ?? player.nickname).replaceAll(/\$[iwozs]/gi, "");

        if (tmc.game.Name === "TmForever" && tmc.settings.get("chat.useEmotes")) {
            for (const emoteData of emotesMap) {
                text = text.replaceAll(
                    new RegExp(`:\\b(${emoteData.emote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b:`, "gi"),
                    `$z$fff${emoteData.glyph}$s$ff0`,
                );
            }
        }

        if (text.indexOf(/\$l/i) === -1) {
            text = text.replaceAll(/(https?:\/\/[^\s]+)/g, "$L$1$L");
        }

        const chatColor = tmc.settings.get("chat.color");
        const adminColor = tmc.admins.includes(login) ? tmc.settings.get("chat.badge.admin") : tmc.settings.get("chat.badge.player");
        const msg = `${nick}$z$s$${adminColor} »$${chatColor} ${text}`;
        tmc.server.send("ChatSendServerMessage", msg);
        if (process.env.DEBUG === "true") {
            tmc.cli(msg);
        }
    }

    async cmdTmfEmotes(login: string, _params: string[]) {
        const window = new ListWindow(login);
        window.title = "Emotes";
        window.size = { width: 82, height: 95 };
        window.setColumns([
            { key: "emote", title: "Name", width: 50 },
            { key: "glyph", title: "Emote", width: 15 },
        ]);
        const outItems = clone(emotesMap).map((item) => {
            return {
                emote: `:${item.emote}:`,
                glyph: item.glyph,
            };
        });
        window.setItems(outItems);
        window.setActions(["Chat"]);
        window.onAction = async (login: string, action: string, item: any) => {
            if (action === "Chat") {
                this.onPlayerChat([1, login, `$z$fff${item.glyph}`]);
            }
        };
        window.display();
    }
}
