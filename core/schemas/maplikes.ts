import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { Map } from "./map";
import { Player } from "./players";

export const MapLikes = sqliteTable("maplikes", {
    id: integer("id").primaryKey(),
    mapUuid: text("uuid").notNull().references(() => Map.uuid),
    login: text("login").notNull().references(() => Player.login),
    vote: real("vote").notNull(),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {

    };
});