import MapsWindow from './mapsWindow';
import MapsWindowAdmin from './mapsWindowAdmin';
import Plugin from '..';
import Menu from '@core/plugins/menu/menu';
import { QueryTypes, type Sequelize } from 'sequelize';

export default class Maps extends Plugin {
    async onLoad() {
        tmc.addCommand('/list', this.cmdMaps.bind(this), 'Display maps list');
        tmc.addCommand('//list', this.cmdAdmMaps.bind(this), 'Display maps list');

        Menu.getInstance().addItem({
            category: 'Map',
            title: 'Map List',
            action: '/list'
        });

        Menu.getInstance().addItem({
            category: 'Map',
            title: 'Manage Maps',
            action: '//list',
            admin: true
        });
    }

    async onUnload() {
        tmc.removeCommand('/list');
    }

    /**
     *  Player command to display the map list
     * @param login
     * @param params
     */
    async cmdMaps(login: any, params: string[]) {
        let rankings: any[] = [];

        const sequelize: Sequelize = tmc.storage['db'];
        if (sequelize) {
            const uids = tmc.maps.getUids();
            rankings = await sequelize.query(
                `SELECT * FROM (
                SELECT mapUuid as Uid, login, time, RANK() OVER (PARTITION BY mapUuid ORDER BY time ASC) AS playerRank
                FROM scores WHERE mapUuid in (?)
                ) AS t WHERE login = ?`,
                {
                    type: QueryTypes.SELECT,
                    raw: true,
                    replacements: [uids, login]
                }
            );
        }
        const window = new MapsWindow(login, params, rankings);
        window.pos.y = 0;
        window.size = { width: 187, height: 120 };
        window.setColumns([
            { key: 'Index', title: '#', width: 4 },
            { key: 'Name', title: 'Name', width: 50, action: 'Queue' },
            { key: 'AuthorName', title: 'Author', width: 30 },
            { key: 'ATime', title: 'Author Time', width: 20 },
            { key: 'Environnement', title: 'Environment', width: 15 },
            { key: 'Rank', title: 'My Rank', width: 10 },
            { key: 'Karma', title: 'Karma', width: 10 },
            { key: 'Date', title: 'Date Added', width: 20 }
        ]);
        window.sortColumn = 'Name';
        window.title = 'Maps [' + tmc.maps.getMapCount() + ']';
        let actions: string[] = [];
        const plugins = Object.keys(tmc.plugins);

        if (plugins.includes('jukebox')) {
            actions.push('Queue');
        }

        if (plugins.includes('records')) {
            actions.push('Records');
        }

        window.setActions(actions);
        window.display();
    }

    /**
     * Admin command to display the map list
     * @param login
     * @param params
     */
    async cmdAdmMaps(login: any, params: string[]) {
        const window = new MapsWindowAdmin(login, params);
        window.size = { width: 155, height: 120 };
        window.setColumns([
            { key: 'Index', title: '#', width: 4 },
            { key: 'Name', title: 'Name', width: 50, action: 'Queue' },
            { key: 'AuthorName', title: 'Author', width: 30 },
            { key: 'Environnement', title: 'Environment', width: 15 },
            { key: 'ATime', title: 'Author Time', width: 20 }
        ]);
        window.title = 'Maps [' + tmc.maps.getMapCount() + ']';
        window.setActions(['Remove']);
        window.display();
    }
}
