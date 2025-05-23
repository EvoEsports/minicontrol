import { writeFileSync } from "node:fs";
import { version } from "./package.json";

const out = {
    version: version,
    build: new Date().toISOString().slice(0, 10),
}
console.log("Updating version.json with", out);
writeFileSync("./version.json", JSON.stringify(out, null, 2), { encoding: "utf-8" });
