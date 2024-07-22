import { Umzug, SequelizeStorage } from 'umzug';
import { Sequelize } from 'sequelize';
import log from './core/log';

const sequelize = new Sequelize(process.env['DATABASE'] ?? "", {
    logging(sql, timing) {
        log.info("$d7c" + sql);
    },
});

export const migrator = new Umzug({
    migrations: {
        glob: ['core/migrations/*.ts', { cwd: process.cwd() }],
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

export type Migration = typeof migrator._types.migration;

(async () => {
    try {
        log.info("$fffMigrating:")
        await migrator.up()
        log.info("$fffMigrating ends!");
        process.exit(0);
    } catch (e: any) {
        log.error("$f00error occurred");
    }
})();