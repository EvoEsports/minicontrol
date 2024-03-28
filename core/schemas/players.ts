import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const Player = sqliteTable("player", {
    login: text("login").primaryKey().unique(),
    nickname: text("nickname"),
    customNick: text("custom_nick").default(""),
    allowOverride: integer("nick_override").default(1),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`)
}, (table) => {
    return {
      
    };
});

