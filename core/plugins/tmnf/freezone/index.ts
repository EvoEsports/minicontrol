/**
* Reference: https://github.com/lythx/trakman/blob/main/plugins/freezone/Freezone.ts
* Ported to Minicontrol by Chris92 <christopher.fluegel@evoesports.gg>
*
* MIT License
*
* Copyright (c) 2022-2023 lythx <lythxxx@gmail.com>
* Copyright (c) 2022-2023 wsrvn <wiseraven@proton.me>
* Copyright (c) 2022-2023 VTXSRB <gutgemacht674@gmail.com>
* Copyright (c) 2022-2023 Felacek <bibgo@duck.com>
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

import Plugin from "@core/plugins";
import http, { ClientRequest } from "http";

export default class Freezone extends Plugin {
    static depends: string[] = ["game:TmForever"];
    isConnected: boolean = false;
    password: string | null = process.env.FREEZONE_PASS ?? null;
    mlHash: string = "6f116833b419fe7cb9c912fdaefb774845f60e79"
    mlUrl: string = "ws.trackmania.com"
    mlVersion: string = "239"
    heartbeatInterval: any | null = null;

    onLoad = async () => {
        if (!this.password) {
            tmc.chat("¤error¤Freezone: Cannot enable plugin - Freezone password was not set, please check your .env file.")
            await tmc.unloadPlugin("tmnf/freezone");
        }
        const status: true | Error = await this.sendHeartbeat();
        if (status instanceof Error) {
            tmc.chat(`¤error¤Freezone: ${status.message}`)
            await tmc.unloadPlugin("tmnf/freezone");
        }
        else {
            this.isConnected = true;
            tmc.cli("¤info¤Freezone: Authenticated.");
            this.heartbeatInterval = setInterval(async (): Promise<void> => { await this.sendHeartbeat() }, 3600000)
        }

    }

    onUnload = async () => {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.isConnected = false;
    }

    sendHeartbeat = async (): Promise<true | Error> => {
        const serverInfo = await tmc.server.call("GetServerOptions", 0);
        const serverPass = await tmc.server.call("GetServerPassword");
        const data = {
            serverLogin: encodeURI(tmc.server.login),
            serverName: serverInfo.Name,
            serverVersion: encodeURI([tmc.game.Name, tmc.game.Version, tmc.game.Build].join()),
            manialiveVersion: encodeURI(this.mlVersion),
            maxPlayers: encodeURI(serverInfo.CurrentMaxPlayers),
            visibility: 0,
            classHash: encodeURI(this.mlHash)
        }
        if (!serverInfo.Name.toLowerCase().includes("freezone")) {
            data.serverName = ('Freezone|' + data.serverName).substring(0, 80);
        }

        const authHeader: string = 'Basic ' + Buffer.from(`${tmc.server.login}:${this.password}`).toString('base64')
        const options = {
            host: this.mlUrl,
            path: '/freezone/live/',
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': "application/json",
                'Accept': "application/json",
                'User-Agent': "ManiaLib Rest Client"
            },
            timeout: 10000,
        }

        return new Promise<true | Error>((resolve, reject): void => {
            const req: ClientRequest = http.request(options, (res): void => {
                if (res.statusCode === 200) {
                    resolve(true)
                    return
                }
                let data: string = ''
                res.on('data', (chunk): void => { data += chunk })
            })
            req.write(JSON.stringify(data))
            req.on('error', (): void => {
                reject(new Error(`HTTP request error.`))
            }).on('timeout', (): void => {
                reject(new Error(`HTTP request timeout.`))
            }).end()
        }).catch((err): Error => {
            const errStr = `Couldn't send Freezone Manialive request. Error: ${err?.message}`
            tmc.cli(errStr);
            return new Error(errStr)
        })
    }
}