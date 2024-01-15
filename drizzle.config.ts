import type { Config } from "drizzle-kit";

export default {
    schema: "./schemas/*",
    out: "./userdata/drizzle",
    dbCredentials: {
        url: "sqlite://userdata/local.sqlite",
    }
} satisfies Config;
