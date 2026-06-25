const oldMigrations = ["00-create-map.ts", "00-create-maplikes.ts", "00-create-player.ts", "00-create-scores.ts", "01-add-playermodel.ts", "02-add-map-mxid.ts", "03-add-player-playtime.ts", "04-create-sectors.ts", "05-add-indexes-to-tables.ts", "06-create-personalbest.ts", "07-add-map-lastPlayed.ts", "08-add-player-connectCount.ts", "09-change-sectors-type.ts"];
const newMigrations = ["00-create-map.ts", "00-create-player.ts", "00-create-maplikes.ts", "00-create-personalbest.ts", "00-create-scores.ts", "00-create-sectors.ts"];

import { Sequelize } from 'sequelize';
import { Tm2Console } from '@core/log';
import { createInterface } from 'node:readline/promises';


const sequelize = new Sequelize(process.env['DATABASE'] ?? '', {
    logging(sql, timing) {
        // log('$d7c' + sql);
    }
});

function log(message: string) {
    const ansiLevel = Number.parseInt(process.env.ANSILEVEL || "0");
    console.log(Tm2Console(message, ansiLevel));
}


(async () => {
    log('\n$5bfStarting database migration from MINIcontrol 0.1x to 0.20...');
    log('This is $f90irreversible$z so please make sure you have a $f90backup of your database $zbefore proceeding.');
    // read input from cli
    if (!process.stdin.isTTY) {
        log('$f00No interactive terminal detected. Aborting migration.');
        return;
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    log("");
    log('Type $0f0yes$z to confirm you want to proceed with the migration.');
    log('To abort, type anything else or press $0f0Ctrl+C.\n');
    let answer = 'no';
    try {
        answer = (await rl.question("")).trim().toLowerCase();
    } catch (e) {
        // ignore
    }
    rl.close();

    if (answer !== 'yes') {
        log('$f00Migration aborted by user.');
        return;
    }

    log('\nChecking for old migrations...');
    const res = await sequelize.query("SELECT name from SequelizeMeta;");
    const appliedMigrations = res[0].map((r: any) => r.name);
    let found = 0;
    for (const migrationName of appliedMigrations) {
        if (oldMigrations.includes(migrationName)) {
            found += 1;
        }
    }

    if (oldMigrations.length !== found) {
        log(`$5bfFound $fff${found} $5bfold migrations out of $fff${oldMigrations.length}$5bf. Skipping migration step.`);
        log('No changes made.');
        log('\n$5bfYou need to either $fffrecreate the database$5bf or manually adjust the $fffSequelizeMeta$5bf table to proceed.\n\n');
        return;
    }
    log('$0f0Ok, all old migrations found. Running migration steps...');

    for (const migrationName of oldMigrations) {
        await sequelize.query(`DELETE FROM SequelizeMeta WHERE name='${migrationName}';`);
        log(`$5bfRemoved old migration record: $fff${migrationName}`);
    }

    for (const migrationName of newMigrations) {
        await sequelize.query(`INSERT INTO SequelizeMeta (name) VALUES ('${migrationName}');`);
        log(`$5bfAdded new migration record: $fff${migrationName}`);
    }
    log('$0f0Migration from 0.10 to 0.20 complete.\n\n');
}
)();