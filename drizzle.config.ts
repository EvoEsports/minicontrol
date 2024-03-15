import type { Config } from "drizzle-kit";

export default {
    schema: ["./core/schemas/*.ts", "./userdata/schemas/*.ts"],
    out: "./userdata/drizzle",
    dbCredentials: {
        url: "sqlite://userdata/local.sqlite",
    }
} satisfies Config;
