import { sql } from "drizzle-orm";
import { index, foreignKey } from "drizzle-orm/sqlite-core";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { Player as player } from "./players";
import { Map } from "./map";

export const Score = sqliteTable("records", {
    mapUuid: text("map_uuid").notNull().references(() => Map.uuid),
    login: text("player").notNull().references(() => player.login),
    time: integer("time").notNull(),    
    checkpoints: text("checkpoints").notNull(),    
    avgTime: integer("avg_time").default(0),
    totalFinishes: integer("finishes").default(1),
    created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`)
}, (table) => {
    return {
        uuidIdx: index("uuid_idx").on(table.mapUuid),
        loginIdx: index("login_idx").on(table.login),       
    };
});