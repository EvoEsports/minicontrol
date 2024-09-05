import { Readable } from "stream";
import zlib from 'zlib';
// @ts-ignore
import Serializer from "xmlrpc/lib/serializer";
// @ts-ignore
import Deserializer from "xmlrpc/lib/deserializer";

export default class DedimaniaClient {
    sessionID = "";

    compress(body: string): Promise<Buffer> {
        return new Promise(function (resolve, reject) {
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
            { methodName: "dedimania.WarningsAndTTR", params: null }
        ]);

        const outData = await this.compress(body);

        let headers: any = {
            "Content-Type": "text/xml",
            "Content-Encoding": "gzip",
            'Connection': 'keep-alive',
            'Content-Length': Buffer.byteLength(outData),
        };

        if (this.sessionID !== "") {
            headers["Cookie"] = this.sessionID;
        }

        const res = await fetch(url, {
            method: "POST",
            body: await this.compress(body),
            headers: {
                "Content-Type": "text/xml",
                "Content-Encoding": "gzip",
                'Connection': "Keep-Alive"
            },
            keepalive: true
        });

        if (method === "dedimania.Authenticate") {
            if (res.headers.getSetCookie()) {
                const header = res.headers.getSetCookie()[0]?.split(";").map((x: string) => x.trim());
                if (header) {
                    for (let cookie of header) {
                        if (cookie.startsWith("PHPSESSID")) {
                            this.sessionID = cookie;
                        }
                    }
                }
            }
        }

        let data = await res.text();
        data = data.replaceAll("<int></int>", "<int>-1</int>");
        const answer: any = await new Promise((resolve, reject) => {
            try {
                const deserializer = new Deserializer();
                deserializer.deserializeMethodResponse(Readable.from(data), (err: any, res: any) => {
                    if (err) {
                        return reject(err);
                    } else {
                        for (let method of res[1][0].methods) {
                            if (method.errors !== "") {
                                return reject(method.errors);
                            }
                        }
                        return resolve(res[0][0]);
                    }
                });
            } catch (err) {
                return reject(err);
            }
        });
        return answer;
    }
}