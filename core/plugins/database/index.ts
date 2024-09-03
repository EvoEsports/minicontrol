import { Sequelize } from 'sequelize-typescript';
import type { Player as PlayerType } from '@core/playermanager';
import Plugin from '@core/plugins';
import { chunkArray, sleep } from '@core/utils';
import Map from '@core/schemas/map.model';
import Player from '@core/schemas/players.model';
import { MigrationError, SequelizeStorage, Umzug } from 'umzug';
import { removeColors } from '@core/utils';
import { GBX, CGameCtnChallenge } from 'gbx';
import { existsSync, promises as fspromises } from 'fs';
import path from 'path';


const strToCar: any = {
    'Stadium': "StadiumCar",
    'StadiumCar': "StadiumCar",
    'CarSport': "StadiumCar",

    'Speed': "DesertCar",
    "American": "DesertCar",
    'DesertCar': "DesertCar",
    'CarDesert': "DesertCar",

    'Alpine': "SnowCar",
    'SnowCar': "SnowCar",
    'CarSnow': "SnowCar",

    'Bay': "BayCar",
    'BayCar': "BayCar",

    'Coast': "CoastCar",
    'CoastCar': "CoastCar",

    'Island': "IslandCar",
    'IslandCar': "IslandCar",
    "SportCar": "IslandCar",

    'Rally': "RallyCar",
    'RallyCar': "RallyCar",
    'CarRally': "RallyCar",

    'CanyonCar': 'CanyonCar',
    'Canyon': 'Canyon',

    'Valley': "ValleyCar",
    'ValleyCar': "ValleyCar",
    'TrafficCar': 'ValleyCar',

    'Lagoon': "LagoonCar",
    'LagoonCar': "LagoonCar",

    "CharacterPilot": "Pilot",
};

export default class GenericDb extends Plugin {

    async onLoad() {
        let sequelize;
        const dbString = (process.env['DATABASE'] ?? "").split("://", 1)[0];
        if (!["sqlite", "mysql", "postgres"].includes(dbString)) {
            tmc.cli("¤error¤Seems you .env is missing 'DATABASE=' define or the database not sqlite, mysql or postgres");
            process.exit(1);
        }

        try {
            sequelize = new Sequelize(process.env['DATABASE'] ?? "", {
                logging(sql, timing) {
                    tmc.debug(`$d7c${removeColors(sql)}`);
                },
            });
            tmc.cli("¤info¤Trying to connect database...")
            await sequelize.authenticate();
            tmc.cli("¤success¤Success!");
        } catch (e: any) {
            tmc.cli("¤error¤" + e.message);
            process.exit(1);
        }

        try {
            for (const path of ["./core/migrations/", "./userdata/migrations/"]) {
                const migrator = new Umzug({
                    migrations: {
                        glob: [path + '*.ts', { cwd: process.cwd() }],
                    },
                    context: sequelize,
                    storage: new SequelizeStorage({
                        sequelize,
                    }),
                    logger: {
                        debug: (message) => { },
                        error: (message) => { tmc.cli("$f00" + message) },
                        warn: (message) => { tmc.cli("$fa0" + message) },
                        info: (message) => { tmc.cli("$5bf" + message.event + " $fff" + message.name) },
                    }
                });
                tmc.cli("¤info¤Running migrations for " + path);
                await migrator.up();
                tmc.cli("¤success¤Success!");
            }
            sequelize.addModels([Map, Player]);
            tmc.storage['db'] = sequelize;
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
            await sleep(250);
            await this.syncMaps();
        }
    }

    async syncMaps() {
        const serverUids = tmc.maps.getUids();
        let result = await Map.findAll();
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

        result = await Map.findAll();
        tmc.cli("¤white¤Importing vehicle data from maps, if missing");
        tmc.cli("¤white¤This can take a while...");
        for (const map of result) {
            const mapInfo = tmc.maps.getMap(map.uuid ?? "");
            if (!map.playerModel) {
                if (mapInfo) {
                    const fileName = path.resolve(tmc.mapsPath, mapInfo.FileName);
                    if (existsSync(fileName)) {
                        const stream = await fspromises.readFile(fileName);
                        const gbx = new GBX<CGameCtnChallenge>(stream, 0);
                        await gbx.parse().then
                        (
                            file => map.update({ playerModel: file.playerModel?.id || mapInfo.Environnement || "" })
                        )
                        .catch
                        (
                            async error => {
                                tmc.cli(`¤error¤Failed to parse "¤white¤${fileName}¤error¤" file, falling back to the map environment...`);
                                tmc.debug(error);

                                await map.update({ playerModel: mapInfo.Environnement || "" });
                            }
                        )
                        .catch
                        (
                            error => {
                                tmc.cli(`¤error¤Failed to update player model to map environment for "¤white¤${fileName}¤error¤" file, skipping...`);
                                tmc.debug(error);
                            }
                        );
                    } else {
                        tmc.cli(`¤error¤ "¤white¤${fileName}¤error¤" not found.`);
                    }
                }
            }
            let car = strToCar[map.playerModel ?? ""] || strToCar[map.environment ?? ""]
            if (mapInfo) mapInfo.Vehicle = car || "";
        }
    }
}