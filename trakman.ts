import { Sequelize, UpdatedAt } from 'sequelize-typescript';
import { removeColors, chunkArray } from './core/utils';
import log from './core/log';
import Map from '@core/plugins/database/models/map.model';
import Player from '@core/plugins/database/models/players.model';
import MapLikes from '@core/plugins/maplikes/models/maplikes.model';
import Score from '@core/plugins/records/models/scores.model';
import { SequelizeStorage, Umzug } from 'umzug';
import pg from 'pg';

const connectionString = 'postgresql://trakman:trakman@localhost:5432/trakman';
const trakmanDb = new pg.Client({ connectionString });
const environments = ['', 'Stadium', 'Island', 'Desert', 'Rally', 'Bay', 'Coast', 'Snow'];

async function query(sql: string): Promise<any> {
    return await trakmanDb.query(sql);
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
                    debug: (message) => {},
                    error: (message) => {
                        log.info('$f00' + message);
                    },
                    warn: (message) => {
                        log.info('$fa0' + message);
                    },
                    info: (message) => {
                        log.info('$5bf' + message.event + ' $fff' + message.name);
                    }
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
    await init();
    try {
        await trakmanDb.connect();
    } catch (e: any) {
        log.info('$f00Error ' + e.message);
    }

    let maps: any = {};
    let players: any = {};
    log.info('$5bfMigrating $fffTrakman $5bfdatabase to $fffMINIcontrol...');
    log.info('$5bfPlease wait and do not interrupt the process...');
    log.info('$5bfProcessing maps...');

    const dbMapIds: any = await query('SELECT Id, * FROM public.map_ids;');
    const dbMaps: any = await query('SELECT Id, * FROM public.maps;');

    for (const map of dbMapIds.rows) {
        maps[map.id] = map.uid;
    }

    log.info('Total: ' + dbMaps.rows.length);
    let outMaps: any = [];
    for (const map of dbMaps.rows) {
        outMaps.push({
            uuid: maps[map.id],
            name: map.name,
            author: map.author,
            authorTime: map.author_time,
            environment: environments[map.Environment]
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
    const dbPlayers: any = await query('SELECT DISTINCT login, id, nickname, last_online FROM public.players;');

    log.info('Total: ' + dbPlayers.rows.length);
    let outPlayers: any = [];
    for (const player of dbPlayers.rows) {
        players[player.id] = player.login;
        outPlayers.push({
            login: player.login,
            nickname: player.nickname,
            createdAt: player.last_online,
            updatedAt: player.last_online,
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
    const dbRecords: any = await query('SELECT * FROM public.records;');
    log.info('Total: ' + dbRecords.rows.length);
    let outRecords: any = [];
    for (const record of dbRecords.rows) {
        if (!players[record.player_id]) continue;
        outRecords.push({
            mapUuid: maps[record.map_id],
            login: players[record.player_id],
            time: record.time,
            checkpoints: record.checkpoints.join(",") || "",
            updatedAt: record.date
        });
    }
    try {
        for (const tempRecords of chunkArray(outRecords, 500)) {
            await Score.bulkCreate(tempRecords as any);
        }
    } catch (e: any) {
        log.info('$f00Error ' + e.message);
        process.exit(1);
    }
    outRecords = [];
    log.info('$5bfProcessing karma...');
    const dbKarma: any = await query('SELECT * FROM votes;');
    log.info('Total: ' + dbKarma.rows.length);
    let outKarma: any = [];
    const date = Date.now();
    for (const k of dbKarma.rows) {
        if (!players[k.player_id]) continue;
        if (!maps[k.map_id]) continue;
        let value = 0;
        k.vote > 50 ? (value = 1.0) : (value = -1.0);
        if (k.vote == 50) value = 0;
        outKarma.push({
            mapUuid: maps[k.map_id],
            login: players[k.player_id],
            createdAt: date,
            updatedAt: k.date,
            vote: value
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
    await trakmanDb.end();
    process.exit(0);
}

main();

