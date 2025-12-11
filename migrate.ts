import { Umzug, SequelizeStorage, type MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';
import log from './core/log';
import { globSync } from 'node:fs';

const sequelize = new Sequelize(process.env['DATABASE'] ?? '', {
    logging(sql, timing) {
        log.info('$d7c' + sql);
    }
});

(async () => {
    try {
        log.info('$fffMigrating:');
        const paths = ["./core/migrations/*.ts", "./userdata/migrations/*.ts", "./userdata/plugins/**/migrations/*.ts"];

        for (const path of paths) {
            const migrator = new Umzug({
                migrations: {
                    glob: [path, { cwd: process.cwd() }]
                },
                context: sequelize,
                storage: new SequelizeStorage({
                    sequelize
                }),
                logger: {
                    debug: (message) => { },
                    error: (message) => {
                        log.info('$f00' + message);
                    },
                    warn: (message) => {
                        log.info('$fa0' + message);
                    },
                    info: (message) => { }
                    //info: (message) => { log.info("$5bf" + message.event + " $fff" + message.name) },
                }
            });
            log.info('$5bfRunning migrations for ' + path);
            await migrator.up();
            log.info('$0f0Success!');
        }

        process.exit(0);
    } catch (e: any) {
        log.error('$f00error occurred');
    }
})();

export type Migration = (params: MigrationParams<Sequelize>, context: Sequelize) => Promise<unknown>;
