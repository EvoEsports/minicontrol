import Plugin from '@core/plugins';
import PlayerWindow from './PlayerWindow';
import { htmlEntities } from '@core/utils';

export default class Players extends Plugin {
    async onLoad() {
        tmc.addCommand('/players', this.cmdPlayers.bind(this), 'Show players');
    }

    async onUnload() {
        tmc.removeCommand('/players');
        tmc.storage['menu']?.removeItem('Players');
    }

    async onStart() {
        if (tmc.storage['menu']) {
            tmc.storage['menu'].addItem({
                category: 'Players',
                title: 'Players List',
                action: '/players'
            });
        }
    }

    async cmdPlayers(login: any, _args: string[]) {
        const window = new PlayerWindow(login);
        window.size = { width: 195, height: 95 };
        window.title = 'Players';
        let players: any = [];
        for (const player of tmc.players.getAll()) {
            players.push({
                nickname: htmlEntities(player.nickname),
                login: player.login,
                path: htmlEntities(player.path)
            });
        }
        window.setItems(players);
        window.setColumns([
            { key: 'nickname', title: 'Nickname', width: 50 },
            { key: 'login', title: 'Login', width: 50, type: 'entry' },
            { key: 'path', title: 'Path', width: 50 }
        ]);

        if (tmc.admins.includes(login)) {
            window.setActions(['Mute', 'Kick', 'Ban']);
        }

        await window.display();
    }
}
