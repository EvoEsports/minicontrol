import { GbxClient } from "./gbx";
import EventEmitter from "node:events";
/**
 * Server class
 */
export default class Server {
    /**
     * GbxClient instance
     */
    gbx: GbxClient

    /** @ignore */
    events: EventEmitter = new EventEmitter();
    /** @ignore */
    methodOverrides: { [key: string]: CallableFunction } = {};
    /** @ignore */
    scriptCalls: { [key: string]: Promise<any> } = {};

    login: string = "";
    name: string = "";

    constructor() {
        this.events.setMaxListeners(50);
        this.gbx = new GbxClient(this);
    }

    onDisconnect(str: string) {
        tmc.cli("¤error¤Disconnected from server.\n" + str);
        process.exit(1);
    }

    async onCallback(method: string, data: any) {
        method = method.replace(/(ManiaPlanet\.)|(TrackMania\.)/i, "Trackmania.").replace("Challenge", "Map");
        if (method == "Trackmania.Echo") {
            if (data[0] == "MiniControl" && data[1] != tmc.startTime) {
                tmc.cli("¤error¤!! Another instance of MiniControl has been started! Exiting this instance !!");
                process.exit(1);
            } else if (data[0] == "MiniControl" && data[1] == tmc.startTime) {
                await tmc.afterStart();
            }
        }
        // convert script events to legacy
        if (method == "Trackmania.ModeScriptCallbackArray") {
            let params = data[1];
            try {
                params = JSON.parse(params);
            } catch (err) {
                console.log(err);
            }
            const outmethod = data[0].replace(/(ManiaPlanet\.)|(TrackMania\.)/i, "Trackmania.")

            // convert waypoints to checkpoints
            if (outmethod == "Trackmania.Event.WayPoint") {
                if (params.isendrace) {
                    this.events.emit("TMC.PlayerFinish", [params.login, params.racetime, params]);
                    return;
                } else {
                    this.events.emit("TMC.PlayerCheckpoint", [params.login, params.racetime, params.checkpointinrace, params]);
                    return;
                }
            }
            if (outmethod == "Trackmania.Event.GiveUp") {
                this.events.emit("TMC.PlayerGiveup", [params.login]);
                return;
            }
            if (process.env.DEBUG == "true") {
                console.log(outmethod, params);
            }

            this.events.emit(outmethod, params);
            return;
        }

        switch (method) {
            case "Trackmania.PlayerCheckpoint": {
                this.events.emit("TMC.PlayerCheckpoint", [data[1], data[2], data[4]]);
                return;
            }
            case "Trackmania.PlayerFinish": {
                if (data[2] < 1) {
                    this.events.emit("TMC.PlayerGiveup", [data[1]]);
                    return;
                }
                this.events.emit("TMC.PlayerFinish", [data[1], data[2]]);
                return;
            }
        }
        if (process.env.DEBUG == "true") {
            console.log(method, data);
        }

        this.events.emit(method, data);
    }

    /**
     * Send request and wait for response
     * @param method
     * @param args
     * @returns
     */
    async call(method: string, ...args: any) {
        if (tmc.game.Name == "TmForever") {
            method = method.replace("Map", "Challenge");
        }
        tmc.debug("$27fcall ¤white¤<> $89a" + method);
        if (tmc.game.Name == "Trackmania" || tmc.game.Name == "ManiaPlanet") {
            if (method == "SetTimeAttackLimit") {
                const settings = { "S_TimeLimit": Number.parseInt(args[0]) / 1000 };
                await tmc.server.call("SetModeScriptSettings", settings);
                return
            }
        }
        if (this.methodOverrides[method]) {
            return await this.methodOverrides[method](...args);
        }
        try {
            return await this.gbx.call(method, ...args);
        } catch (e:any) {
            tmc.cli(e.message);
            return undefined;
        }
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
        this.events.on(method, wrapper);
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
        if (tmc.game.Name == "TmForever") {
            method = method.replace("Map", "Challenge");
        }
        //  tmc.debug("$4a2send ¤white¤>> $89a" + method);
        if (tmc.game.Name == "Trackmania" || tmc.game.Name == "ManiaPlanet") {
            if (method == "SetTimeAttackLimit") {
                const settings = { "S_TimeLimit": Number.parseInt(args[0]) / 1000 };
                this.gbx.send("SetModeScriptSettings", settings);
                return
            }
        }
        if (this.methodOverrides[method]) {
            return this.methodOverrides[method](...args);
        }
        try {
            this.gbx.send(method, ...args);
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

    /**
     * connect to server
     * @param host
     * @param port
     */
    async connect(host: string, port: number): Promise<boolean> {
        try {
            const status = await this.gbx.connect(host, port);
            return status;
        } catch (e: any) {
            tmc.cli(e.message);
        }
        return false;
    }


    /**
     * Fetch server name and server login
     */
    async fetchServerInfo(): Promise<void> {
        let serverPlayerInfo = await this.gbx.call("GetMainServerPlayerInfo");
        let serverOptions = await this.gbx.call("GetServerOptions");
        this.login = serverPlayerInfo.Login;
        this.name = serverOptions.Name;
    }
}