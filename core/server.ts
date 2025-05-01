import { GbxClient } from './gbx';
import EventEmitter from 'node:events';

export interface ServerOptions {
    LadderMode: any;
    Name: string;
    Comment: string;
    Password: string;
    PasswordForSpectator: string;
    CurrentMaxPlayers: string;
    NextMaxPlayers: number;
    CurrentMaxSpectators: number;
    NextMaxSpectators: number;
    IsP2PUpload: boolean;
    IsP2PDownload: boolean;
    CurrentLadderMode: number;
    NextLadderMode: number;
    CurrentVehicleNetQuality: number;
    NextVehicleNetQuality: number;
    CurrentCallVoteTimeOut: number;
    NextCallVoteTimeOut: number;
    CallVoteRatio: number;
    AllowChallengeDownload: boolean;
    AutoSaveReplays: boolean;
}

export interface VersionStruct {
    Name: string;
    Version?: string;
    Build?: string;
}
/**
 * Server class
 */
export default class Server {
    /**
     * GbxClient instance
     */
    gbx: GbxClient;

    /** @ignore */
    events: EventEmitter = new EventEmitter();
    /** @ignore */
    methodOverrides: { [key: string]: CallableFunction } = {};
    /** @ignore */
    scriptCalls: { [key: string]: Promise<any> } = {};

    login: string = '';
    name: string = '';
    packmask: string = '';
    serverOptions: ServerOptions = {} as ServerOptions;
    version: VersionStruct = {} as VersionStruct;

    constructor() {
        this.events.setMaxListeners(100);
        this.gbx = new GbxClient(this);
    }

    onDisconnect(str: string) {
        tmc.cli('¤error¤Disconnected from server. ' + str);
        process.exit(1);
    }

    async onCallback(method: string, data: any) {
        method = method.replace(/(ManiaPlanet\.)|(TrackMania\.)/i, 'Trackmania.').replace('Challenge', 'Map');
        const isDebug = process.env.DEBUG_GBX === 'true';

        // Handle Trackmania.Echo
        if (method === 'Trackmania.Echo') {
            if (data[0] === 'MiniControl' && data[1] !== tmc.startTime) {
                tmc.cli('¤error¤!! Another instance of MiniControl has been started! Exiting this instance !!');
                process.exit(1);
            } else if (data[0] === 'MiniControl' && data[1] === tmc.startTime) {
                await tmc.afterStart();
            }
            return;
        }

        // Handle ModeScriptCallbackArray
        if (method === 'Trackmania.ModeScriptCallbackArray') {
            let params = data[1];
            try {
                params = JSON.parse(params);
            } catch (err) {
                console.log(err);
            }
            const outmethod = data[0].replace(/(ManiaPlanet\.)|(TrackMania\.)/i, 'Trackmania.');

            switch (outmethod) {
                case 'Trackmania.Event.WayPoint':
                    if (params.isendrace) {
                        this.events.emit('TMC.PlayerFinish', [params.login, params.racetime, params]);
                    } else {
                        this.events.emit('TMC.PlayerCheckpoint', [params.login, params.racetime, params.checkpointinrace, params]);
                    }
                    return;
                case 'Trackmania.Event.GiveUp':
                    this.events.emit('TMC.PlayerGiveup', [params.login]);
                    return;
                default:
                    if (isDebug) console.log(outmethod, params);
                    this.events.emit(outmethod, params);
                    return;
            }
        }

        // Handle legacy events
        switch (method) {
            case 'Trackmania.PlayerCheckpoint':
                this.events.emit('TMC.PlayerCheckpoint', [data[1].toString(), data[2], data[4]]);
                return;
            case 'Trackmania.PlayerFinish':
                if (data[0] === 0) return;
                if (data[2] < 1) {
                    this.events.emit('TMC.PlayerGiveup', [data[1].toString()]);
                } else {
                    this.events.emit('TMC.PlayerFinish', [data[1].toString(), data[2]]);
                }
                return;
            default:
                if (isDebug) console.log(method, data);
                this.events.emit(method, data);
        }
    }

    /**
     * Send request and wait for response
     * @param method
     * @param args
     * @returns
     */
    async call(method: string, ...args: any) {
        if (tmc.game.Name == 'TmForever') {
            method = method.replace('Map', 'Challenge');
        }
        tmc.debug('$27fcall ¤white¤<> $89a' + method);
        if (this.methodOverrides[method]) {
            return this.methodOverrides[method](...args);
        }

        if (tmc.game.Name == 'Trackmania' || tmc.game.Name == 'ManiaPlanet') {
            if (method == 'SetTimeAttackLimit') {
                const settings = { S_TimeLimit: Number.parseInt(args[0]) / 1000 };
                tmc.server.send('SetModeScriptSettings', settings);
                return;
            }
        }

        return this.gbx.call(method, ...args);
    }
    /**
     * adds override for a method
     * @param method method to override
     * @param callback callback function
     */
    addOverride(method: string, callback: Function) {
        this.methodOverrides[method] = callback;
    }

    /**
     * removes override for a method
     * @param method method to remove override
     */
    removeOverride(method: string) {
        delete this.methodOverrides[method];
    }

    addListener(method: string, callback: any, obj: object) {
        const wrapper = callback.bind(obj);
        wrapper.listener = callback;
        this.events.addListener(method, wrapper);
    }

    prependListener(method: string, callback: any, obj: object) {
        const wrapper = callback.bind(obj);
        wrapper.listener = callback;
        this.events.prependListener(method, wrapper);
    }

    removeListener(method: string, callback: any) {
        this.events.removeListener(method, callback);
    }

    emit(method: string, ...args: any) {
        this.events.emit(method, ...args);
    }

    /**
     * send request and ignore everything
     * @param method
     * @param args
     * @returns
     */
    send(method: string, ...args: any) {
        if (tmc.game.Name == 'TmForever') {
            method = method.replace('Map', 'Challenge');
        }
        //  tmc.debug("$4a2send ¤white¤>> $89a" + method);
        if (this.methodOverrides[method]) {
            return this.methodOverrides[method](...args);
        }

        if (tmc.game.Name == 'Trackmania' || tmc.game.Name == 'ManiaPlanet') {
            if (method == 'SetTimeAttackLimit') {
                const settings = { S_TimeLimit: Number.parseInt(args[0]) / 1000 };
                this.gbx.send('SetModeScriptSettings', settings);
                return;
            }
        }

        try {
            return this.gbx.send(method, ...args);
        } catch (e: any) {
            tmc.cli(e.message);
            return undefined;
        }
    }

    /**
     * call script method
     * @param method
     * @param args
     * @returns
     */
    async callScript(method: string, ...args: any) {
        return this.gbx.callScript(method, ...args);
    }

    /** perform multicall */
    async multicall(methods: any[]) {
        try {
            return this.gbx.multicall(methods);
        } catch (e: any) {
            tmc.cli(e.message);
            return undefined;
        }
    }

    /** perform multicall */
    async multisend(methods: any[]) {
        try {
            return this.gbx.multisend(methods);
        } catch (e: any) {
            tmc.cli(e.message);
            return undefined;
        }
    }

    /**
     * connect to server
     * @param host
     * @param port
     */
    async connect(host: string, port: number): Promise<boolean> {
        try {
            return this.gbx.connect(host, port);
        } catch (e: any) {
            tmc.cli(e.message);
        }
        return false;
    }

    /**
     * Fetch server name and server login
     */
    async fetchServerInfo(): Promise<void> {
        let serverPlayerInfo = await this.gbx.call('GetMainServerPlayerInfo');
        let serverOptions = await this.gbx.call('GetServerOptions');
        this.version = await this.gbx.call('GetVersion');
        this.packmask = 'Stadium';
        if (this.version.Name != 'Trackmania') {
            this.packmask = await this.gbx.call('GetServerPackMask');
        }
        this.gbx.game = this.version.Name;
        this.login = serverPlayerInfo.Login;
        this.name = serverOptions.Name;
        this.serverOptions = serverOptions;
    }
}
