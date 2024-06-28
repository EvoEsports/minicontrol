
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

async function main() {
    const sqlite = new Database(__dirname + '/../userdata/local.sqlite');
    sqlite.pragma('journal_mode = WAL');
    const xasecoDb = new Database(":memory:");
    if (process.argv.length < 3) {
        console.log("Usage: bun xaseco.ts <mysql_dump.sql>");
        return;
    }
    if (!process.argv[2].endsWith(".sql")) {
        console.log("Invalid file extension. Must be a .sql file.");
        return;
    }
    let sql = readFileSync(process.argv[2], 'utf-8');
    sql = sql.replaceAll("int(11) NOT NULL AUTO_INCREMENT", "INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT").replaceAll("mediumint(9) NOT NULL AUTO_INCREMENT", "INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT").replaceAll(/PRIMARY KEY \(`.*?`\),/g, "");
    sql = sql.replaceAll(/UNIQUE KEY `.*?` \((.*?)\),?/g, 'UNIQUE ($1)').replaceAll(/KEY `(.*?)` \(`.*?`\),?/g, "");
    sql = sql.replaceAll(/(UN)?LOCK TABLES.*?;/g, "").replaceAll(/ENGINE=.*?;/g, ";").replaceAll(/[\\]'(?!,)/g, '`').replaceAll("unsigned", "");
    sql = sql.replaceAll("CHARACTER SET utf8 COLLATE utf8_bin", "").replaceAll(/COMMENT .*?,/g, ",").replaceAll("enum('true','false')", "text");
    sql = sql.replaceAll(/,(\s*?)(\)|$)/g, "$2").replaceAll(/,(\s*?)$/g, "").replaceAll(/,(\s*?)\)/g, ")");
    xasecoDb.exec(sql);

    let maps: any = {};
    let players: any = {};
    console.log("Migrating XAseco database to MINIcontrol...");
    console.log("Please wait and do not interrupt the process...");
    console.log("Processing maps...")
    const dbMaps: any = xasecoDb.prepare("SELECT * FROM challenges").all();
    console.log("Total: " + dbMaps.length);
    for (const map of dbMaps) {
        maps[map.Id] = map.Uid;
        sqlite.exec(`INSERT OR IGNORE INTO map ("uuid", "name", "author", "author_time", "environment") VALUES ('${map.Uid}', '${map.Name}', '${map.Author}', -1, '${map.Environment}')`);
    }
    console.log("Processing players...");
    const dbPlayers: any = xasecoDb.prepare("SELECT * FROM players").all();
    console.log("Total: " + dbPlayers.length);
    for (const player of dbPlayers) {
        players[player.Id] = player.Login;
        sqlite.exec(`INSERT OR IGNORE INTO player (login, nickname, custom_nick, nick_override, created_at, updated_at) VALUES ('${player.Login}', '${player.NickName}', '', 1, '${player.UpdatedAt}', '${player.UpdatedAt}')`);
    }
    console.log("Processing records...");
    const dbRecords: any = xasecoDb.prepare("SELECT * FROM records").all();
    console.log("Total: " + dbRecords.length);
    for (const record of dbRecords) {
        if (!players[record.PlayerId]) continue;
        sqlite.exec(`INSERT OR IGNORE INTO records (map_uuid, player, time, checkpoints, avg_time, finishes, created_at, updated_at) VALUES ('${maps[record.ChallengeId]}', '${players[record.PlayerId]}', ${record.Score}, '${record.Checkpoints}', 0, 1, '${record.CreatedAt}', '${record.UpdatedAt}')`);
    }
    console.log("Processing karma...");
    const dbKarma: any = xasecoDb.prepare("SELECT * FROM rs_karma").all();
    console.log("Total: " + dbKarma.length);
    for (const k of dbKarma) {
        if (!players[k.PlayerId]) continue;
        let value = 0;
        k.Score > 0 ? value = 1.0 : value = -1.0;
        sqlite.exec(`INSERT OR IGNORE INTO maplikes (uuid, login, vote, created_at, updated_at) VALUES ('${maps[k.ChallengeId]}', '${players[k.PlayerId]}', ${value}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
    }
    console.log("Migration complete.");
}

main();
