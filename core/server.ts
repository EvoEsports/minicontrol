import type { GbxClient } from "@evotm/gbxclient";
import EventEmitter from "events";

export default class Server extends EventEmitter {
    gbx: GbxClient
    methodOverrides: { [key: string]: CallableFunction } = {};

    constructor(gbx: GbxClient) {
        super();
        this.setMaxListeners(100);
        this.gbx = gbx;
        const that = this;
        gbx.on("disconnect", () => {
            tmc.cli("$f00Disconnected from server.");
            process.exit(1);
        });
        
        gbx.on("callback", (method, data) => {
            method = method.replace(/(ManiaPlanet\.)|(TrackMania\.)/i, "Trackmania.").replace("Challenge", "Map");
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
                        that.emit("TMC.PlayerFinish", [params.login, params.racetime]);
                        return;
                    } else {
                        that.emit("TMC.PlayerCheckpoint", [params.login, params.racetime, params.checkpointinrace]);
                        return;
                    }
                }
                if (outmethod == "Trackmania.Event.GiveUp") {
                    that.emit("TMC.PlayerGiveup");
                    return;
                }
                if (process.env.DEBUG == "true") {
                    console.log(outmethod, params);
                }

                that.emit(outmethod, params);
                return;
            }

            switch (method) {
                case "Trackmania.PlayerCheckpoint": {
                    that.emit("TMC.PlayerCheckpoint", [data[1], data[2], data[4]]);
                    return;
                }
                case "Trackmania.PlayerFinish": {
                    if (data[2] < 1) {
                        that.emit("TMC.PlayerGiveup");
                        return;
                    }
                    that.emit("TMC.PlayerFinish", [data[1], data[2]]);
                    return;
                }
            }
            if (process.env.DEBUG == "true") {
                console.log(method, data);
            }
            that.emit(method, data);
        })
    }

    /**
     * send request and wait for response
     * @param method
     * @param args 
     * @returns 
     */
    async call(method: string, ...args: any) {
        if (tmc.game.Name == "TmForever") {
            method = method.replace("Map", "Challenge");
        }
        tmc.debug("call >$888 " + method);
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

    async addOverride(method: string, callback: Function) {
        this.methodOverrides[method] = callback;
    }

    async removeOverride(method: string) {
        delete this.methodOverrides[method];
    }

    /**
     * send request and forget request
     * @param method 
     * @param args 
     * @returns 
     */
    send(method: string, ...args: any) {
        if (tmc.game.Name == "TmForever") {
            method = method.replace("Map", "Challenge");
        }
        tmc.debug("$090send >$686 " + method);
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