import { Sequelize } from 'sequelize-typescript';
import type { Player as PlayerType } from '../../playermanager';
import Plugin from '../../plugins';
import { chunkArray } from '../../utils';
import Map from '../../schemas/map.model';
import Player from '../../schemas/players.model';

export default class GenericDb extends Plugin {

    async onLoad() {
        try {
            const sequelize = new Sequelize(process.env['DATABASE'] ?? "", {
                logging(sql, timing) {
                    tmc.debug(`$d7c${sql}`);
                },
            });

            sequelize.addModels([Map, Player]);
            await sequelize.authenticate();
            tmc.storage['db'] = sequelize;

            tmc.cli("¤success¤Database connected.");
            tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
            tmc.server.addListener("Trackmania.MapListModified", this.onMapListModified, this);
        } catch (e: any) {
            tmc.cli("¤error¤" + e.message);
            process.exit(1);
        }
    }

    async onUnload() {
        if (tmc.storage['db']) {
            await tmc.storage['db'].close();
            delete (tmc.storage['db']);
        }
        tmc.server.removeListener("TMC.PlayerConnect", this.onPlayerConnect.bind(this));
    }

    async onStart() {
        await this.syncPlayers();
        await this.syncMaps();
    }

    async onPlayerConnect(player: any) {
        await this.syncPlayer(player);
    }

    async syncPlayer(player: PlayerType) {
        let dbPlayer = await Player.findByPk(player.login);
        if (dbPlayer == null) {
            dbPlayer = await Player.create({
                login: player.login,
                nickname: player.nickname,
                path: player.path,
            });
        } else {
            dbPlayer.update({
                nickname: player.nickname,
                path: player.path
            });
        }
        if (dbPlayer && dbPlayer.customNick) {
            tmc.cli("Setting nickname to " + dbPlayer.customNick);
            player.set("nickname", dbPlayer.customNick);
        }
    }


    async syncPlayers() {
        const players = tmc.players.getAll();
        for (const player of players) {
            await this.syncPlayer(await tmc.players.getPlayer(player.login));
        }
    }

    async onMapListModified(data: any) {
        if (data[2] === true) {
            await this.syncMaps();
        }
    }

    async syncMaps() {
        const serverUids = tmc.maps.getUids();
        const result = await Map.findAll();
        const dbUids = result.map((value: any) => value.uuid);
        const missingUids = chunkArray(serverUids.filter(item => dbUids.indexOf(item) < 0), 50);
        for (const groups of missingUids) {
            let missingMaps: any[] = [];
            for (const uid of groups) {
                const map = tmc.maps.getMap(uid);
                if (!map) continue;
                const outMap = {
                    uuid: map.UId,
                    name: map.Name,
                    author: map.Author,
                    authorNickname: map.AuthorNickname ?? "",
                    authorTime: map.AuthorTime,
                    environment: map.Environnement,
                };
                missingMaps.push(outMap);
            }

            try {
                Map.bulkCreate(missingMaps);
            } catch (e: any) {
                tmc.cli(`¤error¤` + e.message);
            }
        }
    }
}