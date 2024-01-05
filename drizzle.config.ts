import type { Config } from "drizzle-kit";

export default {
    schema: "./schemas/*",
    out: "./drizzle",
    dbCredentials: {
        url: "sqlite://local.db",
    }
} satisfies Config;
