import { Readable } from "node:stream";
import zlib from "node:zlib";
// @ts-ignore
import Serializer from "xmlrpc/lib/serializer";
// @ts-ignore
import Deserializer from "xmlrpc/lib/deserializer";

export class DediamaniaError extends Error { };

export default class DedimaniaClient {

    compress(body: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            zlib.gzip(body, (err, buffer) => {
                if (err) {
                    reject(err);
                }
                resolve(buffer);
            });
        });
    }

    async call(method: string, ...params: any[]) {
        const url = "http://dedimania.net:8002/Dedimania";
        const body = await Serializer.serializeMethodCall("system.multicall", [
            { methodName: method, params: params },
            { methodName: "dedimania.WarningsAndTTR", params: null },
        ]);

        try {
            const res = await fetch(url, {
                method: "POST",
                body: new Uint8Array(await this.compress(body)),
                headers: {
                    "Content-Type": "text/xml",
                    "Content-Encoding": "gzip",
                    Connection: "Keep-Alive",
                },
                keepalive: true,
            });

            let data = await res.text();
            data = data.replaceAll("<int></int>", "<int>-1</int>");

            const answer: any = await new Promise((resolve, reject) => {
                try {
                    const deserializer = new Deserializer();
                    deserializer.deserializeMethodResponse(Readable.from(data), (err: any, res: any) => {
                        if (err) {
                            return reject(err);
                        }
                        for (const method of res[1][0].methods) {
                            if (method.errors !== "") {
                                if (!method.errors.includes("Warning")) {
                                    return reject(new DediamaniaError(method.errors));
                                } else {
                                    tmc.debug(`¤warn¤${method.errors}`);
                                }
                            }
                        }
                        return resolve(res[0][0]);
                    });
                } catch (err) {
                    return reject(err);
                }
            });
            return answer;
        } catch (e: any) {
            if (e.message) {
                tmc.debug(`${e.message}`);
            }
            throw e;
        }
    }
}
