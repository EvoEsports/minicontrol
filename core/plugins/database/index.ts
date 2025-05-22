import { Sequelize } from "sequelize-typescript";
import type { Player as PlayerType } from "@core/playermanager";
import Plugin from "@core/plugins";
import { chunkArray, htmlEntities, sleep } from "@core/utils";
// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
import Map from "@core/schemas/map.model";
import Player from "@core/schemas/players.model";
import { SequelizeStorage, Umzug } from "umzug";
import { removeColors } from "@core/utils";
import { GBX, type CGameCtnChallenge } from "gbx";
import { existsSync, promises as fsPromises } from "node:fs";
import path from "node:path";
import { Op } from "sequelize";
import ListWindow from "@core/ui/listwindow";

const strToCar: any = {
    Stadium: "StadiumCar",
    StadiumCar: "StadiumCar",
    CarSport: "StadiumCar",

    Speed: "DesertCar",
    American: "DesertCar",
    DesertCar: "DesertCar",
    CarDesert: "DesertCar",

    Alpine: "SnowCar",
    SnowCar: "SnowCar",
    CarSnow: "SnowCar",

    Bay: "BayCar",
    BayCar: "BayCar",

    Coast: "CoastCar",
    CoastCar: "CoastCar",

    Island: "IslandCar",
    IslandCar: "IslandCar",
    SportCar: "IslandCar",

    Rally: "RallyCar",
    RallyCar: "RallyCar",
    CarRally: "RallyCar",

    CanyonCar: "CanyonCar",
    Canyon: "Canyon",

    Valley: "ValleyCar",
    ValleyCar: "ValleyCar",
    TrafficCar: "ValleyCar",

    Lagoon: "LagoonCar",
    LagoonCar: "LagoonCar",

    CharacterPilot: "Pilot",
};

interface DbPlayer extends PlayerType {
    joinedAt: number;
    totalPlaytime: number;
    customNick: string;
}

export default class GenericDb extends Plugin {
    async onLoad() {
        try {
            await this.connect();
            tmc.server.prependListener("TMC.PlayerConnect", this.onPlayerConnect, this);
            tmc.server.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);
            tmc.server.addListener("Trackmania.EndMap", this.onEndMap, this);
            tmc.server.addListener("TMC.MapListModified", this.onMapListModified, this);
            tmc.addCommand("/active", this.cmdActive.bind(this), "Show playtime");
            tmc.addCommand("/topactive", this.cmdTopActive.bind(this), "Show top100 playtime");
        } catch (e: any) {
            tmc.cli(`¤error¤${e.message}`);
            process.exit(1);
        }
    }

    async connect() {
        let sequelize: Sequelize;
        const dbString = (process.env["DATABASE"] ?? "").split("://", 1)[0];
        if (!["sqlite", "mysql", "postgres"].includes(dbString)) {
            tmc.cli("¤error¤Seems you .env is missing 'DATABASE=' define or the database not sqlite, mysql or postgres");
            process.exit(1);
        }

        try {
            const enableLog = process.env.DEBUG === "true" && Number.parseInt(process.env.DEBUGLEVEL || "0") >= 2;
            sequelize = new Sequelize(process.env["DATABASE"] ?? "", {
                logging(sql, _timing) {
                    if (enableLog) tmc.debug(`$d7c${removeColors(sql)}`);
                },
            });
            tmc.cli("¤info¤Trying to connect database...");
            await sequelize.authenticate();
            tmc.cli("¤success¤Success!");
        } catch (e: any) {
            tmc.cli(`¤error¤${e.message}`);
            process.exit(1);
        }

        try {
            for (const path of ["./core/migrations/", "./userdata/migrations/"]) {
                const migrator = new Umzug({
                    migrations: {
                        glob: [`${path}*.ts`, { cwd: process.cwd() }],
                    },
                    context: sequelize,
                    storage: new SequelizeStorage({
                        sequelize,
                    }),
                    logger: {
                        debug: (_message) => {},
                        error: (message) => {
                            tmc.cli(`$f00${message}`);
                        },
                        warn: (message) => {
                            tmc.cli(`$fa0${message}`);
                        },
                        info: (message) => {
                            tmc.cli(`$5bf${message.event} $fff${message.name}`);
                        },
                    },
                });
                tmc.cli(`¤info¤Running migrations for ${path}`);
                await migrator.up();
                tmc.cli("¤success¤Success!");
            }
        } catch (e: any) {
            tmc.cli(`¤error¤${e.message}`);
            tmc.cli("¤error¤Failed to run migrations, please check your database.");
            tmc.cli("¤info¤Notice: Sometimes running migrations 2x can fix this issue.");
            process.exit(1);
        }
        sequelize.addModels([Map, Player]);
        tmc.storage["db"] = sequelize;
    }

    async onUnload() {
        if (tmc.storage["db"]) {
            await tmc.storage["db"].close();
            // biome-ignore lint/performance/noDelete: <explanation>
            delete tmc.storage["db"];
        }
        tmc.server.removeListener("TMC.PlayerConnect", this.onPlayerConnect.bind(this));
    }

    async onStart() {
        await this.syncPlayers();
        await this.syncMaps();
    }

    async onPlayerConnect(player: PlayerType) {
        await this.syncPlayer(player);
    }

    async onPlayerDisconnect(player: PlayerType) {
        const dbPlayer = await Player.findByPk(player.login);
        const joinedAt = (player as DbPlayer).joinedAt;
        const sessionTime = Math.floor((new Date().getTime() - joinedAt) / 1000);

        if (dbPlayer) {
            try {
                dbPlayer.totalPlaytime = (dbPlayer.totalPlaytime ?? 0) + sessionTime;
                dbPlayer.connectCount = (dbPlayer.connectCount ?? 0) + 1;
                await dbPlayer.save();
            } catch (e: any) {
                tmc.cli(`¤error¤${e.message}`);
            }
        }
    }

    async onMapListModified(data: any) {
        if (data[2] === true) {
            await this.syncMaps();
        }
    }

    async onEndMap(data: any) {
        try {
            const map = await Map.findByPk(data[0].UId);
            if (map) {
                await map.update({
                    lastPlayed: new Date().toISOString(),
                });
            }
        } catch (e: any) {
            tmc.cli(`¤error¤[Database.EndMap]${e.message}`);
        }
    }

    async syncPlayer(player: PlayerType) {
        try {
            const dbPlayer = await Player.findByPk(player.login);
            if (dbPlayer == null) {
                await Player.create({
                    login: player.login,
                    nickname: player.nickname,
                    zone: player.path,
                    connectCount: 0,
                });
            } else {
                dbPlayer.nickname = player.nickname;
                dbPlayer.zone = player.path;
                await dbPlayer.save();
            }
            player.set("connectCount", dbPlayer?.connectCount || 0);
            player.set("totalPlaytime", dbPlayer?.totalPlaytime || 0);
            player.set("customNick", dbPlayer?.customNick || player.nickname);
            player.set("joinedAt", new Date().getTime());
        } catch (e: any) {
            tmc.cli(`¤error¤[database.syncplayer] ${e.message}`);
        }
    }

    async syncPlayers() {
        const players = tmc.players.getAll();
        for (const player of players) {
            await this.syncPlayer(await tmc.players.getPlayer(player.login));
        }
    }

    async syncMaps() {
        const serverUids = tmc.maps.getUids();
        let result = await Map.findAll();
        const dbUids = result.map((value: any) => value.uuid);
        const missingUids = chunkArray(
            serverUids.filter((item) => dbUids.indexOf(item) < 0),
            50,
        );
        for (const groups of missingUids) {
            const missingMaps: any[] = [];
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
                await Map.bulkCreate(missingMaps);
            } catch (e: any) {
                tmc.cli(`¤error¤${e.message}`);
            }
        }

        result = await Map.findAll({
            where: {
                uuid: {
                    [Op.in]: serverUids,
                },
            },
        });
        tmc.cli("¤white¤Importing vehicle data from maps, if missing");
        tmc.cli("¤white¤This can take a while...");
        for (const map of result) {
            const mapInfo = tmc.maps.getMap(map.uuid ?? "");
            if (!mapInfo) continue;
            mapInfo.CreatedAt = new Date(map.createdAt).toISOString().split("T")[0];
            if (!map.playerModel) {
                if (!mapInfo.Vehicle) {
                    const fileName = path.resolve(tmc.mapsPath, mapInfo.FileName);
                    if (existsSync(fileName)) {
                        const stream = await fsPromises.readFile(fileName);
                        if (!stream) {
                            tmc.debug(`¤error¤Failed to read file "¤white¤${fileName}¤error¤"`);
                            continue;
                        }
                        const gbx = new GBX<CGameCtnChallenge>(stream, 0);
                        gbx.parse()
                            .then((file) => map.update({ playerModel: file.playerModel?.id || mapInfo.Environnement || "" }))
                            .catch(async (error) => {
                                tmc.debug(`¤error¤Failed to parse "¤white¤${fileName}¤error¤" file, falling back to the map environment...`);
                                tmc.debug(error);
                                await map.update({ playerModel: mapInfo.Environnement || "" });
                            })
                            .catch((error) => {
                                tmc.debug(
                                    `¤error¤Failed to update player model to map environment for "¤white¤${fileName}¤error¤" file, skipping...`,
                                );
                                tmc.debug(error);
                            })
                            .then(() => {
                                const car = strToCar[map.playerModel ?? ""] || strToCar[map.environment ?? ""];
                                mapInfo.Vehicle = car || "";
                            });
                    } else {
                        mapInfo.Vehicle = strToCar[map.environment ?? ""] || "";
                        tmc.debug(`¤error¤ "¤white¤${fileName}¤error¤" not found.`);
                    }
                }
            }
        }
        tmc.cli("¤success¤Done!");
    }

    async cmdActive(login: string) {
        const dbPlayer = await Player.findByPk(login);
        if (!dbPlayer) {
            tmc.chat("¤error¤Player not found in database");
            return;
        }

        const tmPlayer = (await tmc.players.getPlayer(login)) as DbPlayer;
        const sessionTime = Math.floor((new Date().getTime() - tmPlayer.joinedAt) / 1000);

        const totalSeconds = (dbPlayer.totalPlaytime || 0) + sessionTime;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const formattedPlaytime = `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}min ${seconds.toString().padStart(2, "0")}s`;

        tmc.chat(`¤info¤Your playtime: ¤white¤${formattedPlaytime}`, login);
    }

    async cmdTopActive(login: string) {
        const players = await Player.findAll({
            order: [["totalPlaytime", "DESC"]],
            limit: 100,
        });
        const topPlayers = players.map((player) => {
            return {
                login: player.login,
                nickname: player.customNick ?? player.nickname ?? player.login ?? "n/a",
                playtime: player.totalPlaytime,
            };
        });
        const window = new ListWindow(login);
        window.title = "Top 100 active players";
        window.setColumns([
            { key: "rank", title: "Rank", width: 10 },
            { key: "nickname", title: "Nickname", width: 50 },
            { key: "playtime", title: "Playtime", width: 20 },
        ]);
        window.setItems(
            topPlayers.map((player, index) => {
                // Convert playtime (seconds) to hh:mm format
                const totalSeconds = player.playtime ?? 0;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                const formattedPlaytime = `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}min ${seconds.toString().padStart(2, "0")}s`;
                return {
                    rank: index + 1,
                    nickname: htmlEntities(player.nickname),
                    playtime: formattedPlaytime,
                };
            }),
        );
        window.size = { width: 100, height: 100 };
        window.display();
    }
}
