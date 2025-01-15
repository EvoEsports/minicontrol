import Plugin from '../index';
import { emotesMap } from './tmnf_emojis';

export default class Chat extends Plugin {
    static depends: string[] = [];
    pluginEnabled: boolean = false;
    publicChatEnabled: boolean = true;
    playersDisabled: string[] = [];

    async onLoad() {
        try {
            this.pluginEnabled = (await tmc.server.call('ChatEnableManualRouting', true, false)) as boolean;
            tmc.server.addListener('Trackmania.PlayerChat', this.onPlayerChat, this);
            tmc.addCommand('//chat', this.cmdChat.bind(this), 'Controls chat');
            tmc.settings.register('chat.color', 'ff0', null, 'Chat color');

            if (tmc.game.Name == 'TmForever') {
                tmc.settings.register('chat.useEmotes', false, null, 'Enable emote replacements in chat (see: http://bit.ly/Celyans_emotes_sheet)');
                tmc.chatCmd.addCommand(
                    '/emotes',
                    async (login: string) => {
                        tmc.chat('$fffTo apply emotes for tmnf, $0cf$L[http://bit.ly/Celyans_emotes_sheet]Click here$l$z$s$fff for instructions!', login);
                    },
                    'How to apply emotes'
                );
            }
        } catch (e: any) {
            this.pluginEnabled = false;
            tmc.cli('ChatPlugin: ¤error¤ ' + e.message);
        }
    }

    async onUnload() {
        try {
            await tmc.server.call('ChatEnableManualRouting', false, false);
        } catch (e: any) {
            console.log(e.message);
        }
        tmc.removeCommand('//chat');
        tmc.server.removeListener('Trackmania.PlayerChat', this.onPlayerChat);
        this.pluginEnabled = false;
    }

    async cmdChat(login: string, params: string[]) {
        if (params.length == 0) {
            tmc.chat(`¤info¤usage: ¤cmd¤//chat <on/off> ¤info¤ or ¤cmd¤//chat <login> <on/off>`);
            return;
        }
        if (params.length == 1 && ['on', 'off'].includes(params[0])) {
            this.publicChatEnabled = params[0] == 'on';
            tmc.chat('¤info¤Public chat is ¤white¤' + params[0]);
            return;
        }
        if (params.length == 2 && ['on', 'off'].includes(params[1])) {
            if (params[1] == 'on') {
                const index = this.playersDisabled.indexOf(params[0]);
                this.playersDisabled.splice(index, 1);
                tmc.chat(`¤info¤Playerchat for ¤white¤${params[0]} ¤info¤is now ¤white¤on!`, login);
            } else {
                this.playersDisabled.push(params[0]);
                tmc.chat(`¤info¤Playerchat for ¤white¤${params[0]} ¤info¤is now ¤white¤off!`, login);
            }
            return;
        }
        tmc.chat('¤info¤usage: ¤cmd¤//chat <on/off> ¤info¤or ¤cmd¤//chat <login> <on/off>');
    }

    async onPlayerChat(data: any) {
        if (!this.pluginEnabled) return;
        if (!this.publicChatEnabled && !tmc.admins.includes(data[1])) {
            tmc.chat('Public chat is disabled.', data[1]);
            return;
        }
        if (data[0] == 0) return;
        if (data[2].startsWith('/')) return;
        if (this.playersDisabled.includes(data[1])) {
            tmc.chat('Your chat is disabled.', data[1]);
            return;
        }
        const player = await tmc.getPlayer(data[1]);
        const nick = player.nickname.replaceAll(/\$[iwozs]/gi, '');
        let text = data[2];
        if (tmc.game.Name == 'TmForever' && tmc.settings.get("chat.useEmotes")) {
            for (const data of emotesMap) {
                text = text.replaceAll(new RegExp('\\b(' + data.emote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'g'), '$z$fff' + data.glyph + '$s$ff0');
            }
        }
        const chatColor = tmc.settings.get('chat.color');
        const msg = `${nick}$z$s$fff »$${chatColor} ${text}`;
        tmc.server.send('ChatSendServerMessage', msg);
        tmc.cli(msg);
    }
}
