import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";


export const Map = sqliteTable("map", {
    uuid: text("uuid").primaryKey().unique(),
    name: text("name").notNull(),
    author: text("author").notNull(),
    authorNickname: text("author_nickname"),
    authorTime: integer("author_time").notNull(),
    environment: text("environment"),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        nameIdx: index("name_idx").on(table.name),
    };
});