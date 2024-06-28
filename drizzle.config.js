import { Config } from "drizzle-kit";

/** @type { import("drizzle-kit").Config } */
export default {
    dialect: "sqlite",
    schema: ["./core/schemas/*.ts", "./userdata/schemas/*.ts"],
    out: "./userdata/drizzle",
    dbCredentials: {
        url: "sqlite://userdata/local.sqlite",
    }
}