import type { Config } from "drizzle-kit";

export default {
    schema: "./core/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        url: "sqlite://local.db",
    }
} satisfies Config;
