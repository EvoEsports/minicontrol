import http, { Agent } from 'node:http';
import { request } from 'node:http';
import type { Socket } from "node:net";

class test {
    agent = new Agent({
        keepAlive: true,
        maxSockets: 2,
        keepAliveMsecs: 1000,
    });
    sockets: Socket[] = [];


    async call(method: string, ...params: any[]) {
        const body = "testing";
        const outData = body; // await this.compress(body);
        const headers: any = {
            "Content-Type": "text/xml",
            "Content-Encoding": "gzip",
            'Connection': 'keep-alive',
            'Content-Length': Buffer.byteLength(outData),
        };

        const res: any = await new Promise((resolve, reject) => {
            const req = request({
                hostname: 'localhost',
                port: 3000,
                path: '/',
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

            req.on('error', function (e) {
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
            console.log("should keepalive? ", req.shouldKeepAlive);
            req.end();
        });
        return res.data;
    }

    async test() {
        const res = await fetch("http://localhost:3000", {
            method: "POST",
            body: "test",
            headers: {
                "Content-Type": "text/xml",
                "Content-Encoding": "gzip",
                'Connection': "Keep-Alive"
            },
            keepalive: true,
            verbose: true
        });
        return await res.text();
    }
}

http.createServer((req, res) => {
    if (req.method === "POST") {
        res.end("Testing...");
    } else {
        res.end("Hello World!");
    }
}).listen(3000, () => {
    console.log("Server listening on port 3000");
});

const t = new test();

setInterval(async () => {
    const data: any = await t.call("test", []);
    console.log(data);
    // const data2: any = await t.test();
    // console.log(data2);
}, 2000);