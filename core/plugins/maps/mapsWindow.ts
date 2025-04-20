import type { Map } from '@core/mapmanager';
import ListWindow from '@core/ui/listwindow';
import { formatTime, htmlEntities, clone, removeColors } from '@core/utils';
import { QueryTypes, type Sequelize } from 'sequelize';

export default class MapsWindow extends ListWindow {
    params: string[] = [];
    // template: string = 'core/plugins/maps/maplist.xml.twig';
    pageSize = 20;

    constructor(login: string, params: string[]) {
        super(login);
        this.params = params;
        this.recipient = login;
        let maps: any = [];
        let i = 1;
        for (const map of clone(tmc.maps.get()) as Map[]) {
            if (
                !this.params[0] ||
                removeColors(map.Name).toLocaleLowerCase().indexOf(this.params[0].toLocaleLowerCase()) !== -1 ||
                removeColors(map.AuthorNickname || map.Author || '').toLocaleLowerCase().indexOf(this.params[0].toLocaleLowerCase()) !== -1 ||
                removeColors(map.Environnement).toLocaleLowerCase().indexOf(this.params[0].toLocaleLowerCase()) !== -1
            ) {
                maps.push(
                    Object.assign(map, {
                        Index: i++,
                        Name: htmlEntities(map.Name.trim()),
                        AuthorName: htmlEntities(map.AuthorNickname || map.Author || ''),
                        ATime: formatTime(map.AuthorTime || map.GoldTime),
                        Vehicle: map.Vehicle ? htmlEntities(map.Vehicle) : '',
                        Rank: '',
                    })
                );
            }
        }
        this.setItems(maps);
    }

    async onPageItemsUpdate(items: any) {
        if (items.length == 0) return items;
        if (items[0]?.Rank) return items;
        const sequelize: Sequelize = tmc.storage['db'];
        if (sequelize) {
            const uids = items.map((val: any) => val.UId);
            const login = this.recipient;
            const rankings: any[] = await sequelize.query(
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
            for (const item of items) {
                const rank =
                    rankings.find((val) => {
                        return item.UId == val.Uid;
                    })?.playerRank || '-';
                item.Rank = rank;
            }
        }
        return items;
    }

    async onAction(login: string, action: string, item: any) {
        if (action == 'Queue') {
            await tmc.chatCmd.execute(login, '/addqueue ' + item.UId);
        }
    }
}
