import Plugin from '@core/plugins';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import ListWindow from '@core/ui/listwindow';
import Player from '@core/schemas/players.model';

interface Ranking {
    rank: number;
    login: string;
    avg: number;
}

export default class Players extends Plugin {
    static depends: string[] = ['database', 'records'];
    rankings: Ranking[] = [];

    async onLoad() {
        tmc.server.addListener('Trackmania.EndMap', this.onEndMap, this);
        tmc.addCommand('/topranks', this.cmdRankings.bind(this), 'Show ranks');
        tmc.addCommand('/rank', this.cmdMyRank.bind(this), 'Show my rank');
        this.rankings = await this.getPlayerRanking();
    }

    async onUnload() {
        tmc.server.removeListener('Trackmania.EndMap', this.onEndMap);
    }

    async onEndMap(data: any) {
        this.rankings = await this.getPlayerRanking();
    }

    async getPlayerRanking(): Promise<Ranking[]> {
        const sequelize: Sequelize = tmc.storage['db'];
        const mapUids = tmc.maps.getUids();
        const mapCount = mapUids.length;
        const maxRank = parseInt(process.env.MAX_RECORDS || '100');
        const rankedRecordCount = 3;
        const rankings: Ranking[] = await sequelize.query(
            `SELECT row_number() OVER (order by average) as rank, login, (average / 10000) as avg FROM (
            SELECT
                login,
                ROUND((SUM(player_rank) + (${mapCount} - COUNT(player_rank)) * ${maxRank}) / ${mapCount} * 10000, 0) AS average,
                COUNT(player_rank) AS ranked_records_count
                FROM
                (
                    SELECT
                        mapUuid,
                        login,
                        time,
                        RANK() OVER (PARTITION BY mapUuid ORDER BY time ASC) AS player_rank
                    FROM scores WHERE mapUuid in ("${mapUids.join('","')}")
                ) AS ranked_records
                WHERE player_rank <= ${maxRank}
                GROUP BY login
            ) grouped_ranks
            WHERE ranked_records_count >= ${rankedRecordCount} order by average asc
            `,
            {
                type: QueryTypes.SELECT,
                raw: true
            }
        );
        return rankings;
    }

    async cmdMyRank(login: string, _args: string[]) {
        const rank = this.rankings.find((val) => val.login == login);
        if (rank) {
            tmc.chat(`Your server rank is ${rank.rank}/${this.rankings.length} with average ${rank.avg}`, login);
        } else {
            tmc.chat(`No rankings found.`, login);
        }
    }

    async cmdRankings(login: string, _args: string[]) {
        const window = new ListWindow(login);
        const players = await Player.findAll();
        const outRanks: any = [];

        for (const rank of this.rankings) {
            outRanks.push({
                rank: rank.rank,
                nickname: players.find((val) => val.login == rank.login)?.nickname,
                avg: rank.avg
            });
        }

        window.setItems(outRanks);
        window.setColumns([
            { key: 'rank', title: 'Rank', width: 20 },
            { key: 'nickname', title: 'Name', width: 60 },
            { key: 'avg', title: 'Average', width: 20 }
        ]);
        await window.display();
    }
}
