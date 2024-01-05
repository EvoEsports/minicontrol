import type { Config } from "drizzle-kit";

export default {
    schema: "./plugins/database/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        url: "sqlite://local.db",
    }
} satisfies Config;
