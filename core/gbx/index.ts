import { Buffer } from "node:buffer";
import { Socket } from "node:net";
import type Server from "../../core/server";
import { Readable } from "node:stream";
/** @ts-ignore */
import Serializer from "xmlrpc/lib/serializer";
/** @ts-ignore */
import Deserializer from "xmlrpc/lib/deserializer";

export class GbxClient {
    isConnected: boolean;
    doHandShake: boolean;
    reqHandle: number;
    private socket: Socket | null;
    recvData: Buffer;
    responseLength: null | number;
    requestHandle: number;
    dataPointer: number;
    server: Server;
    options: any = {
        showErrors: false,
        throwErrors: true,
    };
    timeoutHandler: any;
    promiseCallbacks: { [key: string]: { resolve: CallableFunction; reject: CallableFunction } } = {};
    game = "Trackmania";
    counters = {
        methodsSend: 0,
        methodsReceive: 0,
        callbackReceived: 0,
        sendKbsec: 0,
        sendKbsecLast: 0,
        receiveKbsec: 0,
        receiverKbSecLast: 0,
    };
    private useCounters = process.env.DEBUG_GBX_COUNTERS === "true";
    private counterInterval = 5;

    /**
     * Creates an instance of GbxClient.
     * @memberof GbxClient
     */
    public constructor(server: Server) {
        this.isConnected = false;
        this.reqHandle = 0x80000000;
        this.socket = null;
        this.recvData = Buffer.from([]);
        this.responseLength = null;
        this.requestHandle = 0;
        this.dataPointer = 0;
        this.doHandShake = false;
        this.server = server;
        if (this.counterInterval < 1) {
            this.counterInterval = 1;
        }
        if (this.useCounters) {
            setInterval(() => {
                const c = this.counters;
                c.sendKbsec = c.sendKbsec - c.sendKbsecLast;
                c.receiveKbsec = c.receiveKbsec - c.receiverKbSecLast;
                if (c.sendKbsec < 0) {
                    c.sendKbsec = 0;
                }
                if (c.receiveKbsec < 0) {
                    c.receiveKbsec = 0;
                }

                this.server.onCallback("GbxClient.Counters", {
                    methodsSend: c.methodsSend,
                    methodsReceive: c.methodsReceive,
                    callbackReceived: c.callbackReceived,
                    sendKbsec: c.sendKbsec,
                    receiverKbSec: c.receiveKbsec,
                });

                c.methodsSend = 0;
                c.methodsReceive = 0;
                c.callbackReceived = 0;
                c.sendKbsecLast = c.sendKbsec;
                c.receiverKbSecLast = c.receiveKbsec;
            }, this.counterInterval * 1000);
        }
    }

    /**
     * Connects to trackmania server
     * Supports currently Trackmanias with GBXRemote 2 protocol:
     * Trackmania Nations Forever / Maniaplanet / Trackmania 2020
     *
     * @param {string} [host]
     * @param {number} [port]
     * @returns {Promise<boolean>}
     * @memberof GbxClient
     */
    async connect(host?: string, port?: number): Promise<boolean> {
        const normalizedHost = host || "127.0.0.1";
        const normalizedPort = port || 5000;
        const socket = new Socket();

        // increase max listeners to avoid warnings
        socket.setMaxListeners(30);
        const timeout = 5000;
        this.socket = socket;

        socket.connect(
            {
                host: normalizedHost,
                port: normalizedPort,
                keepAlive: true,
                family: 4,
                noDelay: true,
            },
            () => {
                socket.on("connect", () => {
                    if (this.timeoutHandler) {
                        clearTimeout(this.timeoutHandler);
                        this.timeoutHandler = null;
                    }
                });
                socket.on("end", () => {
                    this.isConnected = false;
                    this.server.onDisconnect("end");
                });
                socket.on("error", (error: any) => {
                    this.isConnected = false;
                    this.server.onDisconnect(error.message);
                });
                socket.on("data", async (data: Buffer) => {
                    if (this.timeoutHandler) {
                        clearTimeout(this.timeoutHandler);
                        this.timeoutHandler = null;
                    }
                    this.handleData(data);
                });
                socket.on("timeout", () => {
                    tmc.cli("¤error¤XMLRPC Connection timeout");
                    process.exit(1);
                });
            },
        );

        this.timeoutHandler = setTimeout(() => {
            tmc.cli("¤error¤[ERROR] Attempt at connection exceeded timeout value.");
            socket.end();
            this.promiseCallbacks.onConnect?.reject(new Error("Connection timeout"));
            // biome-ignore lint/performance/noDelete: <explanation>
            delete this.promiseCallbacks.onConnect;
        }, timeout);

        const res: boolean = await new Promise((resolve, reject) => {
            this.promiseCallbacks.onConnect = { resolve, reject };
        });
        // biome-ignore lint/performance/noDelete: <explanation>
        delete this.promiseCallbacks.onConnect;
        return res;
    }

    private async handleData(data: any | null): Promise<void> {
        // Append new data if available.
        if (data) {
            this.recvData = Buffer.concat([this.recvData, data]);
        }

        // Process all complete messages present in recvData.
        while (true) {
            // If we haven't read the header yet, do so.
            if (this.responseLength === null) {
                // Need at least 4 bytes for the header.
                if (this.recvData.length < 4) break;
                this.responseLength = this.recvData.readUInt32LE(0);
                if (this.isConnected) this.responseLength += 4;
                this.recvData = this.recvData.subarray(4);
            }

            // Wait until the full message is available.
            if (this.responseLength && this.recvData.length >= this.responseLength) {
                const message = this.recvData.subarray(0, this.responseLength);
                if (this.useCounters) this.counters.receiveKbsec += this.responseLength / 1024;

                this.recvData = this.recvData.subarray(this.responseLength);
                // Reset state for the next message.
                this.responseLength = null;

                // Processing handshake response.
                if (!this.isConnected) {
                    const msgStr = message.toString("utf-8");
                    if (msgStr === "GBXRemote 2") {
                        this.isConnected = true;
                        const handshakeCb = this.promiseCallbacks.onConnect;
                        handshakeCb?.resolve(true);
                    } else {
                        this.socket?.destroy();
                        this.isConnected = false;
                        this.socket = null;
                        const handshakeCb = this.promiseCallbacks.onConnect;
                        handshakeCb?.reject(new Error(`Unknown protocol: ${msgStr}`));
                        this.server.onDisconnect(`Unknown protocol: ${msgStr}`);
                    }
                } else {
                    // Processing regular messages.
                    const deserializer = new Deserializer("utf-8");

                    // The first 4 bytes in the message represent the request handle.
                    const requestHandle = message.readUInt32LE(0);
                    const readable = Readable.from(message.subarray(4));
                    if (requestHandle >= 0x80000000) {
                        if (this.useCounters) this.counters.methodsReceive++;
                        const cb = this.promiseCallbacks[requestHandle];
                        if (cb) {
                            deserializer.deserializeMethodResponse(readable, async (err: any, res: any) => {
                                cb.resolve([res, err]);
                                delete this.promiseCallbacks[requestHandle];
                            });
                        }
                    } else {
                        if (this.useCounters) this.counters.callbackReceived++;
                        deserializer.deserializeMethodCall(readable, async (err: any, method: any, res: any) => {
                            if (err && this.options.showErrors) {
                                console.error(err);
                            } else {
                                this.server.onCallback(method, res).catch((err: any) => {
                                    if (this.options.showErrors) {
                                        console.error(`[ERROR] gbxclient > ${err.message}`);
                                    }
                                    if (this.options.throwErrors) {
                                        throw new Error(err);
                                    }
                                });
                            }
                        });
                    }
                }
            } else {
                // Not enough data for a full message, exit the loop.
                break;
            }
        }
    }

    /**
     * execute a xmlrpc method call on a server
     *
     * @param {string} method
     * @param {...any} params
     * @returns any
     * @memberof GbxClient
     */
    async call(method: string, ...params: any) {
        if (!this.isConnected) {
            return undefined;
        }
        try {
            const xml = Serializer.serializeMethodCall(method, params);
            return await this.query(xml, true);
        } catch (err: any) {
            if (this.options.showErrors) {
                console.error(`[ERROR] gbxclient >${err.message}`);
            }
            if (this.options.throwErrors) {
                throw new Error(err);
            }
            return undefined;
        }
    }

    /**
     * execute a xmlrpc method call on a server
     *
     * @param {string} method
     * @param {...any} params
     * @returns any
     * @memberof GbxClient
     */
    send(method: string, ...params: any) {
        if (!this.isConnected) {
            return undefined;
        }
        const xml = Serializer.serializeMethodCall(method, params);
        return this.query(xml, false).catch((err: any) => {
            tmc.cli(`[ERROR] gbxclient > ${err.message}`);
        });
    }

    /**
     * call script method
     *
     * @param {string} method
     * @param {...any} params
     * @returns any
     * @memberof GbxClient
     */
    async callScript(method: string, ...params: any) {
        if (!this.isConnected) {
            return undefined;
        }
        return await this.call("TriggerModeScriptEventArray", method, params);
    }

    /**
     * send a script method
     *
     * @param {string} method
     * @param {...any} params
     * @returns any
     * @memberof GbxClient
     */
    async sendScript(method: string, ...params: any) {
        if (!this.isConnected) {
            return undefined;
        }
        return await this.send("TriggerModeScriptEventArray", method, params);
    }

    private serializeMulticall(methods: Array<any>) {
        return Serializer.serializeMethodCall("system.multicall", [
            methods.map((method) => ({
                methodName: method[0],
                params: method.slice(1),
            })),
        ]);
    }

    /**
     * perform a multicall
     *
     * @example
     * await gbx.multicall([
     *                     ["Method1", param1, param2, ...],
     *                     ["Method2", param1, param2, ...],
     *                     ])
     *
     * @param {Array<any>} methods
     * @returns Array<any>
     * @memberof GbxClient
     */
    async multicall(methods: Array<any>) {
        if (!this.isConnected) {
            return undefined;
        }

        const xml = this.serializeMulticall(methods);
        const out: any = [];
        for (const answer of await this.query(xml, true)) {
            out.push(answer[0]);
        }
        return out;
    }

    /**
     * perform a multisend
     *
     * @example
     * await gbx.multicall([
     *                     ["Method1", param1, param2, ...],
     *                     ["Method2", param1, param2, ...],
     *                     ])
     *
     * @param {Array<any>} methods
     * @returns Array<any>
     * @memberof GbxClient
     */
    async multisend(methods: Array<any>) {
        if (!this.isConnected) {
            return undefined;
        }
        const xml = this.serializeMulticall(methods);
        await this.query(xml, false);
    }

    private async query(xml: string, wait = true) {
        const HEADER_LENGTH = 8;
        const requestSize = xml.length + HEADER_LENGTH;
        if (this.useCounters) this.counters.methodsSend++;

        // Define request size limits per game
        const limits: { [key: string]: number } = {
            Trackmania: 7 * 1024 * 1024,
            TmForever: 1 * 1024 * 1024,
            ManiaPlanet: 4 * 1024 * 1024,
        };

        const limit = limits[this.game];
        if (limit && requestSize > limit) {
            throw new Error(`transport error - request too large (${(xml.length / 1024).toFixed(2)} Kb)`);
        }

        // Increment and wrap request handle if needed
        this.reqHandle++;
        if (this.reqHandle >= 0xffffff00) {
            this.reqHandle = 0x80000000;
        }
        const handle = this.reqHandle;

        // Allocate buffer and write header and XML payload
        const len = Buffer.byteLength(xml, "utf-8");
        const buf = Buffer.alloc(HEADER_LENGTH + len);
        buf.writeInt32LE(len, 0); // write length at offset 0
        buf.writeUInt32LE(handle, 4); // write request handle at offset 4
        buf.write(xml, HEADER_LENGTH, "utf-8"); // write xml starting at offset 8
        if (this.useCounters) this.counters.sendKbsec += (len + HEADER_LENGTH) / 1024;

        // Write buffer to the socket
        await new Promise((resolve, reject) => {
            if (
                !this.socket?.write(buf, (err?: Error) => {
                    if (err) reject(err);
                })
            ) {
                this.socket?.once("drain", resolve);
            } else {
                process.nextTick(resolve);
            }
        });

        // If not waiting for a response, return an empty object.
        if (!wait) {
            this.promiseCallbacks[handle] = {
                resolve: () => {},
                reject: () => {},
            };
            return {};
        }

        // Wait for and retrieve the response
        const response = await new Promise<any>((resolve, reject) => {
            this.promiseCallbacks[handle] = { resolve, reject };
        });
        delete this.promiseCallbacks[handle];

        // Error handling of response if needed.
        if (response[1]) {
            if (this.options.showErrors) {
                console.error(response[1].faultString ? `[ERROR] gbxclient > ${response[1].faultString}` : response[1]);
            }
            if (this.options.throwErrors) {
                throw response[1];
            }
            return undefined;
        }

        return response[0];
    }

    /**
     * Disconnect
     *
     * @returns Promise<true>
     * @memberof GbxClient
     */
    async disconnect(): Promise<true> {
        this.socket?.destroy();
        this.isConnected = false;
        this.server.onDisconnect("disconnect");
        return true;
    }
}
