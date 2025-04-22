import type { Map } from '@core/mapmanager';
import ListWindow from '@core/ui/listwindow';
import { formatTime, htmlEntities, clone, removeColors } from '@core/utils';
import { QueryTypes, type Sequelize } from 'sequelize';

export default class MapsWindow extends ListWindow {
    params: string[] = [];
    // template: string = 'core/plugins/maps/maplist.xml.twig';
    pageSize = 20;

    constructor(login: string, params: string[], rankings: any[]) {
        super(login);
        this.params = params;
        this.recipient = login;
        let maps: any = [];
        let i = 1;

        for (const map of clone(tmc.maps.get()) as Map[]) {
            if (
                !this.params[0] ||
                removeColors(map.Name).toLocaleLowerCase().indexOf(this.params[0].toLocaleLowerCase()) !== -1 ||
                removeColors(map.AuthorNickname || map.Author || '')
                    .toLocaleLowerCase()
                    .indexOf(this.params[0].toLocaleLowerCase()) !== -1 ||
                removeColors(map.Environnement).toLocaleLowerCase().indexOf(this.params[0].toLocaleLowerCase()) !== -1
            ) {
                let karma = Number.parseFloat((map.Karma?.total ?? -1000).toFixed(2));
                let outKarma = '';
                if (karma == 0) {
                    outKarma = '$fff0%';
                } else if (karma > 0) {
                    outKarma = '$0f0' + karma + '%'
                } else if (karma < 0) {
                    outKarma = '$f00' + karma + '%';
                }
                if (karma == -1000.00) {
                    outKarma = '-';
                }

                maps.push(
                    Object.assign(map, {
                        Index: i++,
                        Name: htmlEntities(map.Name.trim()),
                        AuthorName: htmlEntities(map.AuthorNickname || map.Author || ''),
                        ATime: formatTime(map.AuthorTime || map.GoldTime),
                        Vehicle: map.Vehicle ? htmlEntities(map.Vehicle) : '',
                        Rank:
                            rankings.find((val) => {
                                return map.UId == val.Uid;
                            })?.playerRank || '-',
                        Karma: outKarma
                    })
                );
            }
        }
        this.setItems(maps);
    }

    async onAction(login: string, action: string, item: any) {
        if (action == 'Queue') {
            await tmc.chatCmd.execute(login, '/addqueue ' + item.UId);
        }
    }
}
