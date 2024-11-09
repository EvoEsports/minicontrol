import { Sequelize, UpdatedAt } from 'sequelize-typescript';
import { removeColors, chunkArray } from './core/utils';
import log from './core/log';
import Map from './core/schemas/map.model';
import Player from './core/schemas/players.model';
import MapLikes from './core/schemas/maplikes.model';
import Score from './core/schemas/scores.model';
import { SequelizeStorage, Umzug } from 'umzug';
import { faker } from '@faker-js/faker';

async function init() {
    let sequelize;
    try {
        sequelize = new Sequelize(process.env['DATABASE'] ?? "", {
            logging(sql, timing) {
              //  log.info(`$d7c${removeColors(sql)}`);
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
                    info: (message) => { }
                    //info: (message) => { log.info("$5bf" + message.event + " $fff" + message.name) },
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
    await init();
    log.info("Seeding 1000 players...");
    let players:any = [];
    for(let x = 0; x < 1000; x++) {
        players.push({
            login: "mock_player_"+x,
            nickname: "mock_player_"+x,
        });
    }
    await Player.bulkCreate(players);
    log.info("Seeding 500 maps...");
    let maps:any = [];
    for(let x = 0; x < 500; x++) {
        maps.push({
            uuid: faker.string.nanoid(),
            name: faker.word.words(3),
            author: faker.person.firstName(),
            authorTime: Math.floor(Math.random()*120000)
        });
    }
    await Map.bulkCreate(maps);
    let x = 0;
    for (const map of maps) {
        if (x%50 == 0) {
            log.info(`Seeding map data: ${x}/${maps.length}`);
        }
        let records:any = [];
        for (const player of players) {
            records.push({
                mapUuid: map.uuid,
                login: player.login,
                time: Math.floor(Math.random()*120000)
            });
        }
        await Score.bulkCreate(records);
        x+=1;
    }

    log.info("Done");
}


main();