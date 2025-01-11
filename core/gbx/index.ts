import { Buffer } from 'node:buffer';
import { Socket } from 'net';
import type Server from '../../core/server';
import { Readable } from 'stream';
/** @ts-ignore */
import Serializer from 'xmlrpc/lib/serializer';
/** @ts-ignore */
import Deserializer from 'xmlrpc/lib/deserializer';

export class GbxClient {
    isConnected: boolean;
    doHandShake: boolean;
    reqHandle: number;
    private socket: any;
    recvData: Buffer;
    responseLength: null | number;
    requestHandle: number;
    dataPointer: number;
    server: Server;
    options: any = {
        showErrors: false,
        throwErrors: true
    };
    timeoutHandler: any;
    promiseCallbacks: { [key: string]: any } = {};

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
        host = host || '127.0.0.1';
        port = port || 5000;
        const that = this;
        const socket = new Socket();
        const timeout = 5000;
        this.socket = socket;
        socket.connect(
            {
                host: host,
                port: port,
                keepAlive: true
            },
            () => {
                socket.on('connect', () => {
                    clearTimeout(that.timeoutHandler);
                });
                socket.on('end', () => {
                    that.isConnected = false;
                    that.server.onDisconnect('end');
                });
                socket.on('error', (error: any) => {
                    that.isConnected = false;
                    that.server.onDisconnect(error.message);
                });
                socket.on('data', (data: Buffer) => {
                    clearTimeout(that.timeoutHandler);
                    that.handleData(data);
                });
                socket.on('timeout', () => {
                    tmc.cli('¤error¤XMLRPC Connection timeout');
                    process.exit(1);
                });
            }
        );
        this.timeoutHandler = setTimeout(() => {
            tmc.cli('¤error¤[ERROR] Attempt at connection exceeded timeout value.');
            socket.end();
            process.exit(1);
        }, timeout);
        const res: boolean = await new Promise((resolve, reject) => {
            this.promiseCallbacks['onConnect'] = { resolve, reject };
        });

        delete this.promiseCallbacks['onConnect'];
        return res;
    }

    private handleData(data: any | null): void {
        if (data != null) {
            this.recvData = Buffer.concat([this.recvData, data]);
        }
        if (this.recvData.length > 0 && this.responseLength === null) {
            this.responseLength = this.recvData.readUInt32LE();
            if (this.isConnected) this.responseLength += 4;
            this.recvData = this.recvData.subarray(4);
        }

        if (this.responseLength && this.recvData.length >= this.responseLength) {
            let data = this.recvData.subarray(0, this.responseLength);
            if (this.recvData.length > this.responseLength) {
                this.recvData = this.recvData.subarray(this.responseLength);
            } else {
                this.recvData = Buffer.from([]);
            }

            if (!this.isConnected) {
                if (data.toString('utf-8') == 'GBXRemote 2') {
                    this.isConnected = true;
                    this.promiseCallbacks['onConnect']?.resolve(true);
                } else {
                    this.socket?.destroy();
                    this.isConnected = false;
                    this.socket = null;
                    this.promiseCallbacks['onConnect']?.reject(false);
                    this.server.onDisconnect('Unknown protocol: ' + data.toString('utf-8'));
                }
            } else {
                const deserializer = new Deserializer('utf-8');
                const requestHandle = data.readUInt32LE();
                const readable = Readable.from(data.subarray(4));
                if (requestHandle >= 0x80000000) {
                    deserializer.deserializeMethodResponse(readable, (err: any, res: any) => {
                        if (this.promiseCallbacks[requestHandle]) {
                            this.promiseCallbacks[requestHandle].resolve([res, err]);
                        }
                    });
                } else {
                    deserializer.deserializeMethodCall(readable, (err: any, method: any, res: any) => {
                        if (err) {
                            if (this.options.showErrors) console.error(err);
                        } else {
                            this.server.onCallback(method, res);
                        }
                    });
                }
            }
            this.responseLength = null;
            if (this.recvData.length > 0) return this.handleData(null);
            return;
        }
        return;
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
                console.error('[ERROR] gbxclient >' + err.message);
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
        try {
            // tmc.debug(`$080send ¤white¤>> $888${method}`);
            const xml = Serializer.serializeMethodCall(method, params);
            return this.query(xml, false);
        } catch (err: any) {
            if (this.options.showErrors) {
                console.error('[ERROR] gbxclient >' + err.message);
            }
            if (this.options.throwErrors) {
                throw new Error(err.message);
            }
            return undefined;
        }
    }

    /**
     * execute a script method call
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
        return await this.call('TriggerModeScriptEventArray', method, params);
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
        const params: any = [];
        for (let method of methods) {
            params.push({ methodName: method.shift(), params: method });
        }

        const xml = Serializer.serializeMethodCall('system.multicall', [params]);

        const out:any = [];
        for (let answer of await this.query(xml, true)) {
            out.push(answer[0]);
        }
        return out;
    }

    private async query(xml: string, wait: boolean = true) {
        // if request is more than 7mb
        if (xml.length + 8 > 7 * 1024 * 1024) {
            throw new Error('transport error - request too large (' + (xml.length/1024/1024).toFixed(2) + ' Mb)');
        }
        this.reqHandle++;
        if (this.reqHandle >= 0xffffff00) this.reqHandle = 0x80000000;
        const handle = this.reqHandle;
        const len = Buffer.byteLength(xml);
        const buf = Buffer.alloc(8 + len);
        buf.writeInt32LE(len, 0);
        buf.writeUInt32LE(handle, 4);
        buf.write(xml, 8);
        this.socket?.write(buf);
        if (wait) {
            const response = await new Promise<any>((resolve, reject) => {
                this.promiseCallbacks[handle] = { resolve, reject };
            });
            delete this.promiseCallbacks[handle];

            if (response[1]) {
                if (this.options.showErrors) {
                    console.error(response[1].faultString ? '[ERROR] gbxclient > ' + response[1].faultString : response[1]);
                }
                if (this.options.throwErrors) {
                    throw response[1];
                }
                return undefined;
            }
            return response[0];
        }
        return {};
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
        this.server.onDisconnect('disconnect');
        return true;
    }
}
