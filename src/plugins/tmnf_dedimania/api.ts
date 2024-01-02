import * as http from "http";
import zlib from 'zlib';
import { Readable } from "stream";
const Serializer = require("xmlrpc/lib/serializer");
const Deserializer = require("xmlrpc/lib/deserializer");

export default class DedimaniaClient {

    keepAliveAgent = new http.Agent({
        keepAlive: true,
        maxSockets: 1,
        keepAliveMsecs: 20000,
        keepAliveInitialDelay: 20000
    });

    async call(method: string, ...params: any[]) {
        let url = "http://dedimania.net:8001/Dedimania";
        if (method == "dedimania.OpenSession") {
            url = "http://dedimania.net/RPC5/server.php";
        }

        const body = await Serializer.serializeMethodCall(method, params);
        const buffer = zlib.gzipSync(body);
        const response = await fetch(url, {
            method: "POST",
            body: buffer,
            headers: {
                "Content-Type": "text/xml",
                'Content-Encoding': 'gzip',
            },
            keepalive: true
        });
        
        const data = await response.text();
        const deserializer = new Deserializer();
        
        const answer = new Promise((resolve, reject) => {
            deserializer.deserializeMethodResponse(Readable.from(data), (err: any, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        return answer;     
    }
}