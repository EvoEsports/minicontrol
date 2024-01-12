import * as http from "http";
import { Readable } from "stream";
import fetch from 'node-fetch';
const Serializer = require("xmlrpc/lib/serializer");
const Deserializer = require("xmlrpc/lib/deserializer");

export default class DedimaniaClient {

    keepAliveAgent = new http.Agent({
        keepAlive: true,
        maxSockets: 1,       
    });

    async call(method: string, ...params: any[]) {
        const url = "http://dedimania.net:8002/Dedimania";
        const body = await Serializer.serializeMethodCall(method, params);
        const response = await fetch(url, {
            method: "POST",
            body: body,
            compress: true,
            headers: {
                "Content-Type": "text/xml",
            },
            agent: this.keepAliveAgent
        });

        const data = (await response.text()).replaceAll("<int></int>", "<int>-1</int>");
        const answer = await new Promise((resolve, reject) => {
            try {
                const deserializer = new Deserializer();
                deserializer.deserializeMethodResponse(Readable.from(data), (err: any, res: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });        
        return answer;
    }
}