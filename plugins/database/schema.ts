import { sql } from "drizzle-orm";
import { boolean } from "drizzle-orm/mysql-core";
import { sqliteTable, text, integer,  } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("player", {
    login: text("login").primaryKey().unique(),
    nickname: text("nickname"),
    customNick: text("custom_nick").default(""),
    allowOverride: integer("nick_override").default(1),
    created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at").default(sql`CURRENT_TIMESTAMP`)
});
