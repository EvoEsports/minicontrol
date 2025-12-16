import EventEmitter from "node:events";
import { GbxClient } from "./gbx";
import { uuidv4 } from "./utils";

//export type CallMethod = "system.listMethods" | "system.methodSignature" | "system.methodHelp" | "system.multicall" | "Authenticate" | "ChangeAuthPassword" | "EnableCallbacks" | "GetVersion" | "CallVote" | "CallVoteEx" | "InternalCallVote" | "CancelVote" | "GetCurrentCallVote" | "SetCallVoteTimeOut" | "GetCallVoteTimeOut" | "SetCallVoteRatio" | "GetCallVoteRatio" | "SetCallVoteRatios" | "GetCallVoteRatios" | "ChatSendServerMessage" | "ChatSendServerMessageToLanguage" | "ChatSendServerMessageToId" | "ChatSendServerMessageToLogin" | "ChatSend" | "ChatSendToLanguage" | "ChatSendToLogin" | "ChatSendToId" | "GetChatLines" | "ChatEnableManualRouting" | "ChatForwardToLogin" | "SendNotice" | "SendNoticeToId" | "SendNoticeToLogin" | "SendDisplayManialinkPage" | "SendDisplayManialinkPageToId" | "SendDisplayManialinkPageToLogin" | "SendHideManialinkPage" | "SendHideManialinkPageToId" | "SendHideManialinkPageToLogin" | "GetManialinkPageAnswers" | "Kick" | "KickId" | "Ban" | "BanAndBlackList" | "BanId" | "UnBan" | "CleanBanList" | "GetBanList" | "BlackList" | "BlackListId" | "UnBlackList" | "CleanBlackList" | "GetBlackList" | "LoadBlackList" | "SaveBlackList" | "AddGuest" | "AddGuestId" | "RemoveGuest" | "RemoveGuestId" | "CleanGuestList" | "GetGuestList" | "LoadGuestList" | "SaveGuestList" | "SetBuddyNotification" | "GetBuddyNotification" | "WriteFile" | "TunnelSendDataToId" | "TunnelSendDataToLogin" | "Echo" | "Ignore" | "IgnoreId" | "UnIgnore" | "UnIgnoreId" | "CleanIgnoreList" | "GetIgnoreList" | "Pay" | "SendBill" | "GetBillState" | "GetServerCoppers" | "GetSystemInfo" | "SetConnectionRates" | "SetServerName" | "GetServerName" | "SetServerComment" | "GetServerComment" | "SetHideServer" | "GetHideServer" | "IsRelayServer" | "SetServerPassword" | "GetServerPassword" | "SetServerPasswordForSpectator" | "GetServerPasswordForSpectator" | "SetMaxPlayers" | "GetMaxPlayers" | "SetMaxSpectators" | "GetMaxSpectators" | "EnableP2PUpload" | "IsP2PUpload" | "EnableP2PDownload" | "IsP2PDownload" | "AllowChallengeDownload" | "IsChallengeDownloadAllowed" | "AutoSaveReplays" | "AutoSaveValidationReplays" | "IsAutoSaveReplaysEnabled" | "IsAutoSaveValidationReplaysEnabled" | "SaveCurrentReplay" | "SaveBestGhostsReplay" | "GetValidationReplay" | "SetLadderMode" | "GetLadderMode" | "GetLadderServerLimits" | "SetVehicleNetQuality" | "GetVehicleNetQuality" | "SetServerOptions" | "GetServerOptions" | "SetServerPackMask" | "GetServerPackMask" | "SetForcedMods" | "GetForcedMods" | "SetForcedMusic" | "GetForcedMusic" | "SetForcedSkins" | "GetForcedSkins" | "GetLastConnectionErrorMessage" | "SetRefereePassword" | "GetRefereePassword" | "SetRefereeMode" | "GetRefereeMode" | "SetUseChangingValidationSeed" | "GetUseChangingValidationSeed" | "SetWarmUp" | "GetWarmUp" | "ChallengeRestart" | "RestartChallenge" | "NextChallenge" | "StopServer" | "ForceEndRound" | "SetGameInfos" | "GetCurrentGameInfo" | "GetNextGameInfo" | "GetGameInfos" | "SetGameMode" | "GetGameMode" | "SetChatTime" | "GetChatTime" | "SetFinishTimeout" | "GetFinishTimeout" | "SetAllWarmUpDuration" | "GetAllWarmUpDuration" | "SetDisableRespawn" | "GetDisableRespawn" | "SetForceShowAllOpponents" | "GetForceShowAllOpponents" | "SetTimeAttackLimit" | "GetTimeAttackLimit" | "SetTimeAttackSynchStartPeriod" | "GetTimeAttackSynchStartPeriod" | "SetLapsTimeLimit" | "GetLapsTimeLimit" | "SetNbLaps" | "GetNbLaps" | "SetRoundForcedLaps" | "GetRoundForcedLaps" | "SetRoundPointsLimit" | "GetRoundPointsLimit" | "SetRoundCustomPoints" | "GetRoundCustomPoints" | "SetUseNewRulesRound" | "GetUseNewRulesRound" | "SetTeamPointsLimit" | "GetTeamPointsLimit" | "SetMaxPointsTeam" | "GetMaxPointsTeam" | "SetUseNewRulesTeam" | "GetUseNewRulesTeam" | "SetCupPointsLimit" | "GetCupPointsLimit" | "SetCupRoundsPerChallenge" | "GetCupRoundsPerChallenge" | "SetCupWarmUpDuration" | "GetCupWarmUpDuration" | "SetCupNbWinners" | "GetCupNbWinners" | "GetCurrentChallengeIndex" | "GetNextChallengeIndex" | "SetNextChallengeIndex" | "GetCurrentChallengeInfo" | "GetNextChallengeInfo" | "GetChallengeInfo" | "CheckChallengeForCurrentServerParams" | "GetChallengeList" | "AddChallenge" | "AddChallengeList" | "RemoveChallenge" | "RemoveChallengeList" | "InsertChallenge" | "InsertChallengeList" | "ChooseNextChallenge" | "ChooseNextChallengeList" | "LoadMatchSettings" | "AppendPlaylistFromMatchSettings" | "SaveMatchSettings" | "InsertPlaylistFromMatchSettings" | "GetPlayerList" | "GetPlayerInfo" | "GetDetailedPlayerInfo" | "GetMainServerPlayerInfo" | "GetCurrentRanking" | "GetCurrentRankingForLogin" | "ForceScores" | "ForcePlayerTeam" | "ForcePlayerTeamId" | "ForceSpectator" | "ForceSpectatorId" | "ForceSpectatorTarget" | "ForceSpectatorTargetId" | "SpectatorReleasePlayerSlot" | "SpectatorReleasePlayerSlotId" | "ManualFlowControlEnable" | "ManualFlowControlProceed" | "ManualFlowControlIsEnabled" | "ManualFlowControlGetCurTransition" | "CheckEndMatchCondition" | "GetNetworkStats" | "StartServerLan" | "StartServerInternet" | "GetStatus" | "QuitGame" | "GameDataDirectory" | "GetTracksDirectory" | "GetSkinsDirectory" | "SetApiVersion" | "SetCallVoteRatiosEx" | "GetCallVoteRatiosEx" | "SendOpenLinkToId" | "SendOpenLinkToLogin" | "GetServerPlanets" | "GetServerTags" | "SetServerTag" | "UnsetServerTag" | "ResetServerTags" | "SetLobbyInfo" | "GetLobbyInfo" | "CustomizeQuitDialog" | "SendToServerAfterMatchEnd" | "KeepPlayerSlots" | "IsKeepingPlayerSlots" | "AllowMapDownload" | "IsMapDownloadAllowed" | "GetMapsDirectory" | "SetTeamInfo" | "GetTeamInfo" | "SetForcedClubLinks" | "GetForcedClubLinks" | "ConnectFakePlayer" | "DisconnectFakePlayer" | "GetDemoTokenInfosForPlayer" | "DisableHorns" | "AreHornsDisabled" | "DisableServiceAnnounces" | "AreServiceAnnouncesDisabled" | "DisableProfileSkins" | "AreProfileSkinsDisabled" | "SetForcedTeams" | "GetForcedTeams" | "GetModeScriptText" | "SetModeScriptText" | "GetModeScriptInfo" | "GetModeScriptSettings" | "SetModeScriptSettings" | "SendModeScriptCommands" | "SetModeScriptSettingsAndCommands" | "GetModeScriptVariables" | "SetModeScriptVariables" | "TriggerModeScriptEvent" | "TriggerModeScriptEventArray" | "SetServerPlugin" | "GetServerPlugin" | "GetServerPluginVariables" | "SetServerPluginVariables" | "TriggerServerPluginEvent" | "TriggerServerPluginEventArray" | "GetScriptCloudVariables" | "SetScriptCloudVariables" | "RestartMap" | "NextMap" | "AutoTeamBalance" | "SetScriptName" | "GetScriptName" | "GetCurrentMapIndex" | "GetNextMapIndex" | "SetNextMapIndex" | "SetNextMapIdent" | "JumpToMapIndex" | "JumpToMapIdent" | "GetCurrentMapInfo" | "GetNextMapInfo" | "GetMapInfo" | "CheckMapForCurrentServerParams" | "GetMapList" | "AddMap" | "AddMapList" | "RemoveMap" | "RemoveMapList" | "InsertMap" | "InsertMapList" | "ChooseNextMap" | "ChooseNextMapList" | "GetCurrentWinnerTeam";
//export type ServerCallback = "TMC.Vote.Pass" | "TMC.Vote.Deny" | "TMC.Vote.Cancel" | "TMC.MaplistModified" | "TMC.SettingsChanged" | "TMC.ColorsChanged" | "TMC.AdminsChanged" | "TMC.PlayerCheckpoint" | "TMC.PlayerFinish" | "TMC.PlayerGiveup" | "Trackmania.BeginMap" | "Trackmania.BeginMatch" | "Trackmania.BeginRound" | "Trackmania.BillUpdated" | "Trackmania.Echo" | "Trackmania.EndMap" | "Trackmania.EndMatch" | "Trackmania.EndRound" | "Trackmania.MaplistModified" | "Trackmania.ModeScriptCallback" | "Trackmania.ModeScriptCallbackArray" | "Trackmania.PlayerAlliesChanged" | "Trackmania.PlayerChat" | "Trackmania.PlayerConnect" | "Trackmania.PlayerDisconnect" | "Trackmania.PlayerInfoChanged" | "Trackmania.PlayerManialinkPageAnswer" | "Trackmania.ServerStop" | "Trackmania.ServerStart" | "Trackmania.StatusChanged" | "Trackmania.TunnelDataReceived" | "Trackmania.VoteUpdated" | "Trackmania.PlayerCheckpoint" | "Trackmania.PlayerFinish" | "Trackmania.PlayerIncoherence";

export interface ServerOptions {
    LadderMode: unknown;
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
    scriptCalls: { [key: string]: Promise<unknown> } = {};

    login = "";
    name = "";
    packmask = "";
    serverOptions: ServerOptions = {} as ServerOptions;
    version: VersionStruct = {} as VersionStruct;

    constructor() {
        this.events.setMaxListeners(100);
        this.gbx = new GbxClient(this);
    }

    onDisconnect(str: string) {
        tmc.cli(`¤error¤Disconnected from server. ${str}`);
        process.exit(1);
    }

    async onCallback(method: string, data: any) {
        const normalizedMethod = method.replace(/(ManiaPlanet\.)|(TrackMania\.)/i, "Trackmania.").replace("Challenge", "Map");
        const isDebug = process.env.DEBUG_GBX === "true";

        // Handle Trackmania.Echo
        if (normalizedMethod === "Trackmania.Echo") {
            if (data[0] === "MiniControl" && data[1] !== tmc.startTime.toString()) {
                tmc.cli("¤error¤!! Another instance of MiniControl has been started! Exiting this instance !!");
                process.exit(1);
            } else if (data[0] === "MiniControl" && data[1] === tmc.startTime.toString()) {
                await tmc.afterStart();
            }
            return;
        }

        // Handle ModeScriptCallbackArray
        if (normalizedMethod === "Trackmania.ModeScriptCallbackArray") {
            let params = data[1];
            try {
                params = JSON.parse(params);
            } catch (err) {
                console.log(err);
            }
            const outmethod = data[0].replace(/(ManiaPlanet\.)|(TrackMania\.)/i, "Trackmania.");

            switch (outmethod) {
                case "Trackmania.Event.WayPoint":
                    if (params.isendrace) {
                        if (isDebug) console.log("TMC.PlayerFinish", [params.login, params.racetime, params]);
                        this.events.emit("TMC.PlayerFinish", [params.login, params.racetime, params]);
                    } else {
                        if (isDebug) console.log("TMC.PlayerCheckpoint", [params.login, params.racetime, params.checkpointinrace, params]);
                        this.events.emit("TMC.PlayerCheckpoint", [params.login, params.racetime, params.checkpointinrace, params]);
                    }
                    if (isDebug) console.log(outmethod, params);
                    this.events.emit(outmethod, params);
                    return;
                case "Trackmania.Event.GiveUp":
                    if (isDebug) console.log("TMC.PlayerGiveup", [params.login]);
                    this.events.emit("TMC.PlayerGiveup", [params.login]);
                    if (isDebug) console.log(outmethod, params);
                    this.events.emit(outmethod, params);
                    return;
                default:
                    if (isDebug) console.log(outmethod, params);
                    this.events.emit(outmethod, params);
                    return;
            }
        }

        // Handle legacy events
        switch (normalizedMethod) {
            case "Trackmania.PlayerCheckpoint":
                if (isDebug) console.log(normalizedMethod, data);
                this.events.emit("TMC.PlayerCheckpoint", [data[1].toString(), data[2], data[4]]);
                return;
            case "Trackmania.PlayerFinish":
                if (data[0] === 0) return;
                if (data[2] < 1) {
                    if (isDebug) console.log("TMC.PlayerGiveup", [data[1].toString()]);
                    this.events.emit("TMC.PlayerGiveup", [data[1].toString()]);
                } else {
                    if (isDebug) console.log("TMC.PlayerFinish", [data[1].toString(), data[2]]);
                    this.events.emit("TMC.PlayerFinish", [data[1].toString(), data[2]]);
                }
                return;
            default:
                if (isDebug) console.log(normalizedMethod, data);
                this.events.emit(normalizedMethod, data);
        }
    }

    /**
     * Send request and wait for response
     * @param method
     * @param args
     * @returns
     */
    async call(method: string, ...args: any) {
        let callMethod = method.toString();
        if (this.version.Name === "TmForever") {
            callMethod = callMethod.replace("Map", "Challenge");
        }
        tmc.debug(`$27fcall ¤white¤<> $89a${callMethod}`);
        if (this.methodOverrides[callMethod]) {
            return this.methodOverrides[callMethod](...args);
        }

        if (this.version.Name === "Trackmania" || this.version.Name === "ManiaPlanet") {
            if (method === "SetTimeAttackLimit") {
                const settings = { S_TimeLimit: Number.parseInt(args[0], 10) / 1000 };
                tmc.server.send("SetModeScriptSettings", settings);
                return;
            }
        }

        return this.gbx.call(callMethod, ...args);
    }
    /**
     * adds override for a method
     * @param method method to override
     * @param callback callback function
     */
    addOverride(method: string, callback: CallableFunction) {
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
        // First try direct removal (if the exact function reference is in the emitter)
        this.events.removeListener(method, callback);
        // Additionally, remove any wrapper listeners created by addListener
        // where wrapper.listener === original callback
        try {
            const listeners = this.events.listeners(method) ?? [];
            for (const l of listeners) {
                // If listener is a wrapper and stores the original as `listener`, remove it
                if (l && (l as any).listener === callback) this.events.removeListener(method, l);
            }
        } catch {
            // ignore emitter introspection failures
        }
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
        let sendMethod = method;
        if (this.version.Name === "TmForever") {
            sendMethod = sendMethod.replace("Map", "Challenge");
        }
        //  tmc.debug("$4a2send ¤white¤>> $89a" + sendMethod);
        if (this.methodOverrides[sendMethod]) {
            return this.methodOverrides[sendMethod](...args);
        }

        if (this.version.Name === "Trackmania" || this.version.Name === "ManiaPlanet") {
            if (sendMethod === "SetTimeAttackLimit") {
                const settings = { S_TimeLimit: Number.parseInt(args[0], 10) / 1000 };
                this.gbx.send("SetModeScriptSettings", settings);
                return;
            }
        }

        try {
            return this.gbx.send(sendMethod, ...args);
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
    async callScript(method: string, ...args: any): Promise<any> {
        const uid = uuidv4();
        const response = new Promise((resolve, reject) => {
            try {
                if (method.includes("Get") === false) {
                    this.gbx.sendScript(method, ...args);
                    resolve(null);
                    return;
                }

                this.gbx.sendScript(method, ...args, uid);
                const timeout = setTimeout(() => {
                    reject(new Error(`Script call to ${method} timed out after 5 seconds`));
                }, 5000);
                this.events.on(method.replace("Get", ""), (result: any) => {
                    if (result.responseid === uid) {
                        clearTimeout(timeout);
                        resolve(result);
                    }
                });
            } catch (e: any) {
                reject(e);
            }
        });
        return response;
    }

    /**
     * call script method
     * @param method
     * @param args
     * @returns
     */
    async sendScript(method: string, ...args: any): Promise<any> {
        await this.gbx.callScript(method, ...args);
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
     * @ignore
     */
    async fetchServerInfo() {
        const serverPlayerInfo = await this.gbx.call("GetMainServerPlayerInfo");
        const serverOptions = await this.gbx.call("GetServerOptions");
        this.version = await this.gbx.call("GetVersion");
        this.packmask = "Stadium";
        if (this.version.Name !== "Trackmania") {
            this.packmask = await this.gbx.call("GetServerPackMask");
        }
        this.gbx.game = this.version.Name;
        this.login = serverPlayerInfo.Login;
        this.name = serverOptions.Name;
        this.serverOptions = serverOptions;
    }

    /**
     * @ignore
     */
    async limitScriptCallbacks() {
        if (this.version.Name !== "Trackmania") return;
        const limitCb = (process.env.XMLRPC_LIMIT_SCRIPT_CALLBACKS ?? "true") === "true";

        try {
            const cbList = await tmc.server.callScript("XmlRpc.GetCallbacksList");
            await tmc.server.send("TriggerModeScriptEventArray", "XmlRpc.UnblockCallbacks", cbList.callbacks);

            const filteredList = cbList.callbacks.filter((cb: string) => {
                let bool = false;
                if (
                    //cb.endsWith("_Start") ||
                    cb.endsWith("_End") ||
                    cb.startsWith("Trackmania.Event.On") ||
                    cb === "Trackmania.Event.SkipOutro" ||
                    cb === "Trackmania.Event.StartLine"
                ) {
                    bool = true;
                }
                return bool;
            });
            if (!limitCb) {
                tmc.cli("Limiting script callbacks...");
                tmc.server.sendScript("XmlRpc.BlockCallbacks", ...filteredList);
            }
            const enabledCb = await tmc.server.callScript("XmlRpc.GetCallbacksList_Enabled");

            tmc.cli(
                `¤info¤Enabled Script Callbacks: $fff${enabledCb.callbacks.length}/${cbList.callbacks.length} ¤gray¤(${enabledCb.callbacks.join(", ")})`,
            );
        } catch (e: any) {
            tmc.cli(`¤error¤Failed to limit script callbacks: ${e.message}`);
        }
    }
}