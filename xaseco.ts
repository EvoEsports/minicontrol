
import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { Sequelize, UpdatedAt } from 'sequelize-typescript';
import { removeColors, chunkArray } from './core/utils';
import log from './core/log';
import Map from './core/schemas/map.model';
import Player from './core/schemas/players.model';
import MapLikes from './core/schemas/maplikes.model';
import Score from './core/schemas/scores.model';
import { SequelizeStorage, Umzug } from 'umzug';

const sqlite = sqlite3.verbose()
const xasecoDb = new sqlite.Database(":memory:");

async function query(sql: string): Promise<any> {
    const res = await new Promise((resolve, reject) => {
        xasecoDb.all(sql, (err: any, rows: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
    return res;
}


async function init() {
    let sequelize;
    try {
        sequelize = new Sequelize(process.env['DATABASE'] ?? "", {
            logging(sql, timing) {
                log.info(`$d7c${removeColors(sql)}`);
            },
        });
        log.info("$5bfTrying to connect migrate database...")
        await sequelize.authenticate();
        log.info("$0f0Success!");
    } catch (e: any) {
        log.info("$f00" + e.message);
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
                    error: (message) => { log.info("$f00" + message) },
                    warn: (message) => { log.info("$fa0" + message) },
                    info: (message) => { log.info("$5bf" + message.event + " $fff" + message.name) },
                }
            });
            log.info("$5bfRunning migrations for " + path);
            await migrator.up();
            log.info("$0f0Success!");
        }
        sequelize.addModels([Map, Player, MapLikes, Score]);
    } catch (e: any) {
        log.info("$f00" + e.message);
        process.exit(1);
    }
}
async function main() {
    if (process.argv.length < 3) {
        log.info("Usage: tsx --env-file=.env xaseco.ts <mysql_dump.sql>");
        return;
    }

    if (!process.argv[2].endsWith(".sql")) {
        log.info("Invalid file extension. Must be a .sql file.");
        return;
    }

    await init();
    let sql = readFileSync(process.argv[2], 'utf-8');
    sql = sql.replaceAll("int(11) NOT NULL AUTO_INCREMENT", "INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT").replaceAll("mediumint(9) NOT NULL AUTO_INCREMENT", "INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT").replaceAll(/PRIMARY KEY \(`.*?`\),/g, "");
    sql = sql.replaceAll(/UNIQUE KEY `.*?` \((.*?)\),?/g, 'UNIQUE ($1)').replaceAll(/KEY `(.*?)` \(`.*?`\),?/g, "");
    sql = sql.replaceAll(/(UN)?LOCK TABLES.*?;/g, "").replaceAll(/ENGINE=.*?;/g, ";").replaceAll(/[\\]'(?!,)/g, '`').replaceAll("unsigned", "");
    sql = sql.replaceAll("CHARACTER SET utf8 COLLATE utf8_bin", "").replaceAll(/COMMENT .*?,/g, ",").replaceAll("enum('true','false')", "text");
    sql = sql.replaceAll(/,(\s*?)(\)|$)/g, "$2").replaceAll(/,(\s*?)$/g, "").replaceAll(/,(\s*?)\)/g, ")");

    const answer: any = await new Promise((resolve, reject) => {
        xasecoDb.exec(sql, (err: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(null);
            }
        });
    });

    let maps: any = {};
    let players: any = {};
    log.info("$5bfMigrating $fffXAseco $5bfdatabase to $fffMINIcontrol...");
    log.info("$5bfPlease wait and do not interrupt the process...");
    log.info("$5bfProcessing maps...")
    const dbMaps: any = await query("SELECT Id, * FROM challenges;");
    log.info("Total: " + dbMaps.length);
    let outMaps = [];
    for (const map of dbMaps) {
        maps[map.Id] = map.Uid;
        outMaps.push({
            uuid: map.Uid,
            name: map.Name,
            author: map.Author,
            authorTime: -1,
            environment: map.Environment
        });
    }
    try {
        for (const mapp of chunkArray(outMaps, 500)) {
            await Map.bulkCreate(mapp);
        }
    } catch (e: any) {
        log.info("$f00Error " + e.message);
        process.exit(1);
    }
    outMaps = [];
    log.info("$5bfProcessing players...");
    const dbPlayers: any = await query("SELECT DISTINCT Login, Id, NickName, UpdatedAt FROM players;");
    log.info("Total: " + dbPlayers.length);
    let outPlayers = [];
    for (const player of dbPlayers) {
        players[player.Id] = player.Login;
        outPlayers.push({
            login: player.Login,
            nickname: player.NickName,
            createdAt: player.UpdatedAt,
            updatedAt: player.UpdatedAt
        });
    }
    try {
        for (const tempPlayers of chunkArray(outPlayers, 500)) {
            await Player.bulkCreate(tempPlayers);
        }
    } catch (e: any) {
        log.info("$f00Error " + e.message);
        process.exit(1);
    }
    outPlayers = [];
    log.info("$5bfProcessing records...");
    const dbRecords: any = await query("SELECT * FROM records;");
    log.info("Total: " + dbRecords.length);
    let outRecords = [];
    for (const record of dbRecords) {
        if (!players[record.PlayerId]) continue;
        outRecords.push({
            mapUuid: maps[record.ChallengeId],
            login: players[record.PlayerId],
            time: record.Score,
            checkpoints: record.Checkpoints,
            updatedAt: record.UpdatedAt
        });
    }
    try {
        for (const tempRecords of chunkArray(outRecords, 500)) {
            await Score.bulkCreate(tempRecords);
        }
    } catch (e: any) {
        log.info("$f00Error " + e.message);
        process.exit(1);
    }
    outRecords = [];
    log.info("$5bfProcessing karma...");
    const dbKarma: any = await query("SELECT * FROM rs_karma;");
    log.info("Total: " + dbKarma.length);
    let outKarma = [];
    const date = Date.now();
    for (const k of dbKarma) {
        if (!players[k.PlayerId]) continue;
        if (!maps[k.ChallengeId]) continue;
        let value = 0;
        k.Score > 0 ? value = 1.0 : value = -1.0;
        if (k.Score == 0) value = 0.;        
        outKarma.push({
            mapUuid: maps[k.ChallengeId],
            login: players[k.PlayerId],
            createdAt: date,
            updatedAt: date,
            vote: value
        });
    }
    try {
        for (const tempKarma of chunkArray(outKarma, 500)) {
            await MapLikes.bulkCreate(tempKarma);
        }
    } catch (e: any) {
        log.info("$f00Error " + e.message);
        process.exit(1);
    }
    log.info("$5bfMigration $0f0complete");
}

main();
