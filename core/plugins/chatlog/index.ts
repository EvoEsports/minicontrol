import ListWindow from '@core/ui/listwindow';
import Plugin from '..';
import { clone } from '@core/utils';
import Menu from '../menu/menu';

interface ChatLogMessage {
    text: string;
    login: string;
    nickname: string;
    date: string;
}

export default class ChatLog extends Plugin {
    private chatLog: ChatLogMessage[] = [];

    async onLoad() {
        tmc.server.addListener('Trackmania.PlayerChat', this.onPlayerChat, this);
        tmc.settings.register(
            'chatlog.maxlines',
            20,
            async (newValue: any, _oldValue: any) => {
                this.chatLog = this.chatLog.slice(0, newValue);
            },
            'ChatLog: Max lines in chat log'
        );
        tmc.addCommand('/chatlog', this.cmdChatLog.bind(this), 'Display chat log');

        Menu.getInstance().addItem({
            category: 'Server',
            title: 'Chat Log',
            action: '/chatlog'
        });
    }

    async onUnload() {
        tmc.server.removeListener('Trackmania.PlayerChat', this.onPlayerChat);
        tmc.removeCommand('/chatlog');
    }

    async onPlayerChat(data: any) {
        if (data[0] === 0) return;
        if (data[2].startsWith('/')) return;
        const login = data[1];
        const text = data[2];
        const player = await tmc.getPlayer(login);
        const nick = player.nickname.replaceAll(/\$[iwozs]/gi, '');
        const msg = {
            text: text.replaceAll(/\$[iwozs]/gi, ''),
            login: login,
            nickname: nick,
            date: new Date().toTimeString().split(' ')[0]
        };
        this.chatLog.unshift(msg);
        this.chatLog = this.chatLog.slice(0, tmc.settings.get('chatlog.maxlines'));
    }

    async cmdChatLog(login: string, params: string[]) {
        const window = new ListWindow(login);
        window.title = 'Chat Log';
        window.size = { width: 200, height: 120 };
        window.setColumns([
            { key: 'date', title: 'Time', width: 20 },
            { key: 'nickname', title: 'Nickname', width: 50 },
            { key: 'text', title: 'Message', width: 125 }
        ]);
        const chatLog = clone(this.chatLog).reverse();
        window.setItems(chatLog);

        window.pageSize = 20;
        window.display();
    }
}
