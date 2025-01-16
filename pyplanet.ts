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

const sqlite = sqlite3.verbose();
const pyplanetDb = new sqlite.Database(':memory:');

async function query(sql: string): Promise<any> {
    const res = await new Promise((resolve, reject) => {
        pyplanetDb.all(sql, (err: any, rows: any) => {
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
        sequelize = new Sequelize(process.env['DATABASE'] ?? '', {
            logging(sql, timing) {
                if (process.env['DEBUG'] == 'true') {
                    log.info(`$d7c${removeColors(sql)}`);
                }
            }
        });
        log.info('$5bfTrying to connect migrate database...');
        await sequelize.authenticate();
        log.info('$0f0Success!');
    } catch (e: any) {
        log.info('$f00' + e.message);
        process.exit(1);
    }

    try {
        for (const path of ['./core/migrations/', './userdata/migrations/']) {
            const migrator = new Umzug({
                migrations: {
                    glob: [path + '*.ts', { cwd: process.cwd() }]
                },
                context: sequelize,
                storage: new SequelizeStorage({
                    sequelize
                }),
                logger: {
                    debug: (_message) => {},
                    error: (message) => {
                        log.info('$f00' + message);
                    },
                    warn: (message) => {
                        log.info('$fa0' + message);
                    },
                    info: (_message) => {}
                    // info: (message) => { log.info("$5bf" + message.event + " $fff" + message.name) },
                }
            });
            log.info('$5bfRunning migrations for ' + path);
            await migrator.up();
            log.info('$0f0Success!');
        }
        sequelize.addModels([Map, Player, MapLikes, Score]);
    } catch (e: any) {
        log.info('$f00' + e.message);
        process.exit(1);
    }
}
async function main() {
    if (process.argv.length < 3) {
        log.info('Usage: tsx --env-file=.env pyplanet.ts <mysql_dump.sql>');
        return;
    }

    if (!process.argv[2].endsWith('.sql')) {
        log.info('Invalid file extension. Must be a .sql file.');
        return;
    }

    await init();
    let sql = readFileSync(process.argv[2], 'utf-8');
    sql = sql
        .replaceAll('int(11) NOT NULL AUTO_INCREMENT', 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT')
        .replaceAll('mediumint(9) NOT NULL AUTO_INCREMENT', 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT')
        .replaceAll(/PRIMARY KEY \(`.*?`\),?/g, '');
    sql = sql.replaceAll(/UNIQUE KEY `.*?` \((.*?)\),?/g, 'UNIQUE ($1)').replaceAll(/KEY `(.*?)` \(`.*?`\),?/g, '');
    sql = sql
        .replaceAll(/(UN)?LOCK TABLES.*?;/g, '')
        .replaceAll(/ENGINE=.*?;/g, ';')
        .replaceAll(/[\\]'(?!,)/g, '`')
        .replaceAll('unsigned', '');
    sql = sql
        .replaceAll('CHARACTER SET utf8 COLLATE utf8_bin', '')
        .replaceAll(/COMMENT .*?,/g, ',')
        .replaceAll("enum('true','false')", 'text');
    sql = sql
        .replaceAll(/,(\s*?)(\)|$)/g, '$2')
        .replaceAll(/,(\s*?)$/g, '')
        .replaceAll(/,(\s*?)\)/g, ')');
    log.info('$5bfMigrating $fffPyPlanet $5bfdatabase to $fffMINIcontrol...');
    log.info('$5bfPlease wait and do not interrupt the process...');
    log.info('$5bfImporting database to memory... please wait...');
    const answer: any = await new Promise((resolve, reject) => {
        pyplanetDb.exec(sql, (err: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(null);
            }
        });
    });
    log.info('Done.');
    let maps: any = {};
    let players: any = {};
    log.info('$5bfProcessing maps...');
    const dbMaps: any = await query('SELECT DISTINCT uid, * FROM map;');
    log.info('Total: ' + dbMaps.length);
    let outMaps: any = [];
    for (const map of dbMaps) {
        maps[map.id] = map.uid;
        outMaps.push({
            uuid: map.uid,
            name: map.name,
            author: map.author_login,
            authorNickname: map.author_nickname,
            authorTime: map.time_author ?? map.time_gold ?? 0,
            environment: map.environment,
            tmxId: map.mx_id,
            createdAt: map.created_at,
            updatedAt: map.updated_at
        });
    }
    try {
        for (const mapp of chunkArray(outMaps, 500)) {
            await Map.bulkCreate(mapp as any);
        }
    } catch (e: any) {
        log.info('$f00Error ' + e.message);
        process.exit(1);
    }
    outMaps = [];
    log.info('$5bfProcessing players...');
    const dbPlayers: any = await query('SELECT DISTINCT login, * FROM player;');
    log.info('Total: ' + dbPlayers.length);
    let outPlayers: any = [];
    for (const player of dbPlayers) {
        players[player.id] = player.login;
        let nickname = player.nickname;
        let customNick = null;
        if (player.uplay_nickname) {
            nickname = player.uplay_nickname ?? player.nickname;
            customNick = player.nickname;
        }

        outPlayers.push({
            login: player.login,
            nickname: nickname,
            customNick: customNick,
            totalPlaytime: player.total_playtime ?? 0,
            createdAt: player.created_at,
            updatedAt: player.updated_at
        });
    }
    try {
        for (const tempPlayers of chunkArray(outPlayers, 500)) {
            await Player.bulkCreate(tempPlayers as any);
        }
    } catch (e: any) {
        log.info('$f00Error ' + e.message);
        process.exit(1);
    }
    outPlayers = [];
    log.info('$5bfProcessing records...');
    const dbRecords: any = await query('SELECT * FROM localrecord;');
    log.info('Total: ' + dbRecords.length);
    let outRecords: any = [];
    for (const record of dbRecords) {
        if (!players[record.player_id]) continue;
        outRecords.push({
            mapUuid: maps[record.map_id],
            login: players[record.player_id],
            time: record.score,
            checkpoints: record.checkpoints,
            updatedAt: record.updated_at,
            createdAt: record.created_at
        });
    }
    try {
        for (const tempRecords of chunkArray(outRecords, 1500)) {
            await Score.bulkCreate(tempRecords as any);
        }
    } catch (e: any) {
        log.info('$f00Error ' + e.message);
        process.exit(1);
    }
    outRecords = [];
    log.info('$5bfProcessing karma...');
    const dbKarma: any = await query('SELECT * FROM karma;');
    log.info('Total: ' + dbKarma.length);
    let outKarma: any = [];
    const date = Date.now();
    for (const k of dbKarma) {
        if (!players[k.player_id]) continue;
        if (!maps[k.map_id]) continue;
        outKarma.push({
            mapUuid: maps[k.map_id],
            login: players[k.player_id],
            createdAt: k.created_at,
            updatedAt: k.updated_at,
            vote: k.score ?? 0
        });
    }
    try {
        for (const tempKarma of chunkArray(outKarma, 500)) {
            await MapLikes.bulkCreate(tempKarma as any);
        }
    } catch (e: any) {
        log.info('$f00Error ' + e.message);
        process.exit(1);
    }
    log.info('$5bfMigration $0f0complete');
    process.exit(0);
}

main();
