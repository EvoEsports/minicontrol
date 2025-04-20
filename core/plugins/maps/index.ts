import MapsWindow from './mapsWindow';
import MapsWindowAdmin from './mapsWindowAdmin';
import Plugin from '..';
import Menu from '@core/plugins/menu/menu';

export default class Maps extends Plugin {
    async onLoad() {
        tmc.addCommand('/list', this.cmdMaps.bind(this), 'Display maps list');
        tmc.addCommand('//list', this.cmdAdmMaps.bind(this), 'Display maps list');

        Menu.getInstance().addItem({
            category: 'Map',
            title: 'Show Maplist',
            action: '/list'
        });

        Menu.getInstance().addItem({
            category: 'Server',
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
        const window = new MapsWindow(login, params);
        window.pos.y = 0;
        window.size = { width: 187, height: 120 };
        window.setColumns([
            { key: 'Index', title: '#', width: 4 },
            { key: 'Name', title: 'Name', width: 50, action: 'Queue' },
            { key: 'AuthorName', title: 'Author', width: 30 },
            { key: 'ATime', title: 'Author Time', width: 20 },
            { key: 'Environnement', title: 'Environment', width: 15 },
            { key: 'Vehicle', title: 'Vehicle', width: 20 },
            { key: 'Rank', title: 'Rank', width: 10 }
        ]);
        window.sortColumn = 'Name';
        window.title = 'Maps [' + tmc.maps.getMapCount() + ']';
        window.setActions(['Queue']);
        await window.display();
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
        await window.display();
    }
}
