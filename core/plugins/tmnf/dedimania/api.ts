import { Readable } from "stream";
import zlib from 'zlib';
// @ts-ignore
import Serializer from "xmlrpc/lib/serializer";
// @ts-ignore
import Deserializer from "xmlrpc/lib/deserializer";
import { request, Agent } from 'http';
import type { Socket } from "bun";


export default class DedimaniaClient {
    sessionID = "";
    agent = new Agent({
        keepAlive: true,
        maxSockets: 1,
        keepAliveMsecs: 3000,
    });
    sockets: Socket[] = [];

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

        const res: any = await new Promise((resolve, reject) => {
            const req = request({
                hostname: 'dedimania.net',
                port: 8002,
                path: '/Dedimania',
                method: 'POST',
                headers: headers,
                agent: this.agent,
            }, (response) => {
                response.setEncoding('utf-8');
                let recvData = '';
                response.on('data', (chunk) => {
                    recvData += chunk;
                });
                response.on('end', () => {
                    resolve({ data: recvData, headers: response.headers });
                });

            });

            req.on('error', function (e:any) {
                console.log(e);
                reject(e);
            });

            req.on("socket", (socket: any) => {
                if (!this.sockets.includes(socket)) {
                    console.log("new socket created");
                    this.sockets.push(socket);
                    socket.on("close", function () {
                        console.log("socket has been closed");
                    });
                }
            });

            req.write(outData);
            req.end();
        });

        /*const res = await fetch(url, {
            method: "POST",                       
            body: await this.compress(body),            
            headers: {
                "Content-Type": "text/xml",
                "Content-Encoding": "gzip",
                'Connection': "Keep-Alive"
            }, 
            keepalive: true,
            verbose: true
        });*/

        if (method === "dedimania.Authenticate") {
            if (res.headers['set-cookie'][0]) {
                const header = res.headers['set-cookie'][0]?.split(";").map((x: string) => x.trim());
                if (header) {
                    for (let cookie of header) {
                        if (cookie.startsWith("PHPSESSID")) {
                            this.sessionID = cookie;
                        }
                    }
                }
            }
        }
        const data = res.data.replaceAll("<int></int>", "<int>-1</int>");
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