
// import { GbxClient } from "@evotm/gbxclient";
import { GbxClient } from "./gbx";
import EventEmitter from "events";

/**
 * Server class
 */
export default class Server extends EventEmitter {
    /**
     * GbxClient instance
     */
    gbx: GbxClient
    /** 
     * method overrides
     */
    methodOverrides: { [key: string]: CallableFunction } = {};

    constructor() {
        super();
        this.setMaxListeners(50);
        this.gbx = new GbxClient(this);
    }

    onDisconnect(str: string) {
        tmc.cli("¤error¤Disconnected from server.");
        process.exit(1);
    }

    async onCallback(method: string, data: any) {
        method = method.replace(/(ManiaPlanet\.)|(TrackMania\.)/i, "Trackmania.").replace("Challenge", "Map");
        if (method == "Trackmania.Echo") {
            if (data[0] == "MiniControl" && data[1] != tmc.startTime) {
                tmc.cli("¤error¤!! Another instance of MiniControl has been started! Exiting this instance !!");
                process.exit(1);
            } else if (data[0] == "MiniControl" && data[1] == tmc.startTime) {
                this.emit("TMC.Start");
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
                    this.emit("TMC.PlayerFinish", [params.login, params.racetime, params]);
                    return;
                } else {
                    this.emit("TMC.PlayerCheckpoint", [params.login, params.racetime, params.checkpointinrace, params]);
                    return;
                }
            }
            if (outmethod == "Trackmania.Event.GiveUp") {
                this.emit("TMC.PlayerGiveup");
                return;
            }
            if (process.env.DEBUG == "true") {
                console.log(outmethod, params);
            }

            this.emit(outmethod, params);
            return;
        }

        switch (method) {
            case "Trackmania.PlayerCheckpoint": {
                this.emit("TMC.PlayerCheckpoint", [data[1], data[2], data[4]]);
                return;
            }
            case "Trackmania.PlayerFinish": {
                if (data[2] < 1) {
                    this.emit("TMC.PlayerGiveup");
                    return;
                }
                this.emit("TMC.PlayerFinish", [data[1], data[2]]);
                return;
            }
        }
        if (process.env.DEBUG == "true") {
            console.log(method, data);
        }

        this.emit(method, data);
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
        tmc.debug("$27fcall $fff<> $89a" + method);
        if (tmc.game.Name == "Trackmania") {
            if (method == "SetTimeAttackLimit") {
                const settings = { "S_TimeLimit": Number.parseInt(args[0]) / 1000 };
                await tmc.server.call("SetModeScriptSettings", settings);
                return
            }
        }
        if (this.methodOverrides[method]) {
            return await this.methodOverrides[method](...args);
        }
        return await this.gbx.call(method, ...args);
    }
    /**
     * adds override for a method
     * @param method method to override
     * @param callback callback function
     */
    async addOverride(method: string, callback: Function) {
        this.methodOverrides[method] = callback;
    }

    /**
     * removes override for a method
     * @param method method to remove override
     */
    async removeOverride(method: string) {
        delete this.methodOverrides[method];
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
      //  tmc.debug("$4a2send $fff>> $89a" + method);
        if (tmc.game.Name == "Trackmania") {
            if (method == "SetTimeAttackLimit") {
                const settings = { "S_TimeLimit": Number.parseInt(args[0]) / 1000 };
                this.gbx.send("SetModeScriptSettings", settings);
                return
            }
        }
        if (this.methodOverrides[method]) {
            return this.methodOverrides[method](...args);
        }
        this.gbx.send(method, ...args);
    }

    /**
     *  call script method
     * @param method 
     * @param args 
     * @returns 
     */
    async callScript(method: string, ...args: any) {
        return await this.gbx.callScript(method, ...args);
    }

    /**
     * connect to server
     * @param host 
     * @param port 
     * @returns {boolean} Returns true if connection was successful
     */
    async connect(host: string, port: number) {
        return await this.gbx.connect(host, port);
    }

}