import Score from "@core/schemas/scores.model";
import Plugin from "../index";
import Player from "@core/schemas/players.model";
import ListWindow from "@core/ui/listwindow";

interface RankingMap {
    [key: string]: number
}

export default class TopPlayers extends Plugin {
    static depends: string[] = ["records"];
    topPlayersCache!: [string, number][] | null;
    topPlayersCacheTime!: Date | null;

    async onLoad() {
        tmc.addCommand("/top50", this.cmdTop50.bind(this), "Get top 50 players of the server.");
    }

    async onUnload() {
        tmc.removeCommand("/top50");
    }

    async cmdTop50(login: string) {
        const msg = "¤info¤Loading Top 50 players of the server...";
        tmc.chat(msg, login);
        tmc.cli(msg);
        const ranking = await this.getTopPlayers(50);
        if (!ranking) {
            tmc.chat("No ranking yet.", login);
            tmc.cli("No ranking yet.");
            return;
        }

        let formattedRanking = [];
        for (let player of ranking) {
            formattedRanking.push(
                {
                    rank: player[1],
                    nickname: player[0],
                });
        }

        const window = new ListWindow(login);
        window.size = { width: 50, height: 95 };
        window.title = "Top 50 Players of this server [" + formattedRanking.length + "]";
        window.setItems(formattedRanking);
        window.setColumns([
            { key: "rank", title: "Rank", width: 10 },
            { key: "nickname", title: "Nickname", width: 40 },
        ]);
        await window.display();
    }

    async getTopPlayers(maxPlayers: number) {
        if (!("records" in tmc.plugins)) {
            return null;
        }

        const now = new Date().getTime();
        const diff = this.topPlayersCacheTime ? Math.floor((now - this.topPlayersCacheTime.getTime()) / 1000) : null;

        // Picks in cache if it has been less than 60 seconds since the last command usage.
        if (!this.topPlayersCache || !diff || diff > 60) {
            this.topPlayersCache = null;
            this.topPlayersCacheTime = null;
        } else {
            return this.topPlayersCache;
        }

        const maps = tmc.maps.getMaplist();
        const mapsCount = maps.length;
        let players: RankingMap = {};

        for (const map of maps) {
            // Fetches the records of the map.
            const records = await Score.findAll({
                where: {
                    mapUuid: map.UId
                },
                order: [
                    ['time', 'ASC'],
                    ['updatedAt', 'ASC'],
                ],
                include: { model: Player, attributes: ['nickname'] },
                limit: maxPlayers,
            });

            // Count records.
            const count = records.length;

            let rank = 1;
            // Updates the ranking with the record rank for each player.
            for (const record of records) {
                if (record.player) {
                    if (!(record.player.nickname! in players)) {
                        players[record.player.nickname!] = 0
                    }
                    
                    // Convert rank position into points.
                    players[record.player.nickname!] += (count - rank) + 1;
                    rank++;
                }
            }
        }

        // Calculates averages.
        let ranking: [string, number][] = Object.entries(players).map(([key, value]) => [key, value / mapsCount]);
        // Sorts the averages by descending order.
        ranking = ranking.sort(([, a], [, b]) => b - a);
        // Assigns the new ranks for the players.
        ranking = ranking.map((entry, index) => [entry[0], index + 1]);

        this.topPlayersCache = ranking
        this.topPlayersCacheTime = new Date();
        return this.topPlayersCache;
    }
}

