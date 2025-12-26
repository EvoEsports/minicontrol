import Window from "@core/ui2/window";

import { chunkArray, parseEntries } from "./utils";
import type IManialink from "@core/ui2/interfaces/imanialink";
import Manialink from "@core/ui2/manialink.ts";


export interface uiModule {
    id: string;
    position: number[];
    scale: number;
    visible: boolean;
}
export type ActionCallback = (login: string, data: any, entries?: { [key: string]: unknown }) => Promise<void>;
export type ComponentFunction = (attrs: { [key: string]: any }) => { replacement: string; script?: string };

interface CustomUI {
    notice: boolean;
    challenge_info: boolean;
    net_infos: boolean;
    chat: boolean;
    checkpoint_list: boolean;
    round_scores: boolean;
    scoretable: boolean;
    multilap_infos: boolean;
    speed_and_distance: boolean;
    player_ranking: boolean;
    global: boolean;
}

export default class UiManager {
    private actions: { [key: string]: { callback: CallableFunction; data: any } } = {};
    private publicManialinks: { [key: string]: IManialink } = {};
    private playerManialinks: { [login: string]: { [id: string]: IManialink } } = {};
    // starting uuid for manialink
    private manialinkUUID = 2;
    // array of logins that have hidden manialinks
    private hiddenManialinks: string[] = [];
    private uiProperties: uiModule[] = [];
    private tagHandlers: Map<string, ComponentFunction> = new Map();

    tmnfCustomUi: CustomUI = {
        notice: false,
        challenge_info: false,
        net_infos: true,
        chat: true,
        checkpoint_list: false,
        round_scores: true,
        scoretable: true,
        multilap_infos: true,
        speed_and_distance: false,
        player_ranking: false,
        global: true,
    };

    /**
     * @ignore
     */
    async init() {
        tmc.server.addListener("Trackmania.PlayerManialinkPageAnswer", this.onManialinkAnswer, this);
        tmc.server.addListener("Trackmania.PlayerConnect", this.onPlayerConnect, this);
        tmc.server.addListener("Trackmania.PlayerDisconnect", this.onPlayerDisconnect, this);
        if (tmc.game.Name === "Trackmania") {
            await this.getUiProperties();
            this.resetUiProperties();
        }

        if (tmc.game.Name === "TmForever") {
            tmc.settings.register("tmf.hud.round_scores", true, this.uiSettingsChange.bind(this), "TmForever HUD: Show round scores");
            tmc.settings.register("tmf.hud.checkpoint_list", false, this.uiSettingsChange.bind(this), "TmForever HUD: Show checkpoint list");
            tmc.settings.register("tmf.hud.net_infos", true, this.uiSettingsChange.bind(this), "TmForever HUD: Show net infos");
            tmc.settings.register("tmf.hud.challenge_info", false, this.uiSettingsChange.bind(this), "TmForever HUD: Show challenge info");
            tmc.settings.register("tmf.hud.notice", false, this.uiSettingsChange.bind(this), "TmForever HUD: Show notice");
        }
    }

    /**
     *  @ignore
     */
    async afterInit() {
        if (tmc.game.Name === "TmForever") {
            await this.syncTmfHudSettings();
        }
        if (tmc.game.Name === "Trackmania") {
            this.setUiProperty("Race_RespawnHelper", "visible", false);
            this.setUiProperty("Race_DisplayMessage", "visible", false);
            this.setUiProperty("Race_BestRaceViewer", "visible", false);
            this.setUiProperty("Race_DisplayMessage", "visible", false);
            this.setUiProperty("Race_Record", "scale", 0.8);
            this.setUiProperty("Race_Countdown", "position", [155, -50]);
            // checkpoint counter is integrated with laps counter for some reason
            this.setUiProperty("Race_LapsCounter", "position", [155.7, -77]);
            this.setUiProperty("Race_LapsCounter", "scale", 0.7);
            this.sendUiProperties();
        }
        tmc.server.send("SendDisplayManialinkPage", this.convert(this.getGlobalManialink()), 0, false);
    }

    async getUiProperties() {
        const data = await tmc.server.callScript("Common.UIModules.GetProperties");
        this.uiProperties = data.uimodules as uiModule[];
    }

    resetUiProperties() {
        const reset: string[] = [];
        for (const uiModule of this.uiProperties) {
            reset.push(uiModule.id);
        }
        const json = {
            uimodules: reset,
        };
        tmc.server.sendScript("Common.UIModules.ResetProperties", `${JSON.stringify(json)}`);
    }

    async setUiProperty(id: string, property: string, value: any) {
        const uiModule: { [key: string]: any } = this.uiProperties.find((uiModule) => uiModule.id === id) ?? {};
        if (uiModule.id === id) {
            uiModule[property] = value;
            uiModule[`${property}_update`] = true;
        } else {
            tmc.cli(`¤error¤ui module not found: ¤white¤${id}`);
        }
    }

    sendUiProperties() {
        tmc.server.send("TriggerModeScriptEventArray", "Common.UIModules.SetProperties", [`{"uimodules": ${JSON.stringify(this.uiProperties)}}`]);
    }

    /**
     * @ignore
     * @param line
     * @returns
     */
    private convertLine(line: string): string {
        // Process each tag separately so we only use/remove z-index that belongs to that tag.
        const tagRegex = /<([a-zA-Z0-9_-]+)([^>]*)>/g;
        let out = line;
        let tagMatch: RegExpExecArray | null;
        while ((tagMatch = tagRegex.exec(line)) !== null) {
            const fullTag = tagMatch[0];
            const attrs = tagMatch[2]; // attributes text including leading space

            // find tag-local z-index if present (supports single or double quotes)
            const zMatch = attrs.match(/\bz-index\s*=\s*(['"])(-?\d+(?:\.\d+)?)\1/);
            const zFromAttr = zMatch ? zMatch[2] : undefined;

            let newAttrs = attrs;

            // Replace pos attributes (supports single/double quotes, works regardless of order)
            newAttrs = newAttrs.replace(/\bpos\s*=\s*(['"])(.*?)\1/g, (_m, _q, raw) => {
                const parts = raw.trim().split(/\s+/);
                const xStr = parts[0] ?? "";
                const yStr = parts[1] ?? "";
                const zStr = parts[2];
                const isNumeric = (s: string) => /^-?([\.\d]+)?$/.test(s);
                if (isNumeric(xStr) && isNumeric(yStr)) {
                    const x = (Number.parseFloat(xStr) / 160) * 64;
                    const y = (Number.parseFloat(yStr) / 90) * 48;
                    let zVal = 0;
                    if (zStr !== undefined && isNumeric(zStr)) zVal = Number.parseFloat(zStr);
                    else if (zFromAttr !== undefined && isNumeric(zFromAttr)) zVal = Number.parseFloat(zFromAttr);
                    return ` posn="${x.toFixed(3)} ${y.toFixed(3)} ${zVal.toFixed(3)}"`;
                } else {
                    let zPart = "";
                    if (zStr !== undefined) zPart = ` ${zStr}`;
                    else if (zFromAttr !== undefined) zPart = ` ${zFromAttr}`;
                    return ` posn="${xStr} ${yStr}${zPart}"`;
                }
            });

            // Replace size attributes (supports single/double quotes)
            newAttrs = newAttrs.replace(/\bsize\s*=\s*(['"])(.*?)\1/g, (_m, _q, raw) => {
                const parts = raw.trim().split(/\s+/);
                const xStr = parts[0] ?? "";
                const yStr = parts[1] ?? "";
                const isNumeric = (s: string) => /^-?([\.\d]+)?$/.test(s);
                if (isNumeric(xStr) && isNumeric(yStr)) {
                    const x = (Number.parseFloat(xStr) / 160) * 64;
                    const y = (Number.parseFloat(yStr) / 90) * 48;
                    return ` sizen="${x.toFixed(3)} ${y.toFixed(3)}"`;
                } else {
                    return ` sizen="${xStr} ${yStr}"`;
                }
            });

            // remove the tag-local z-index (we moved it into posn if needed)
            newAttrs = newAttrs.replace(/\s*z-index\s*=\s*(['"])(-?\d+(?:\.\d+)?)\1/g, "");

            // Replace the attributes section in the original tag with the new attributes
            const newTag = fullTag.replace(attrs, newAttrs);
            out = out.replace(fullTag, newTag);
        }
        return out + "\n";
    }

    /**
     * @ignore
     * @param text
     * @returns
     */
    convert(text: string): string {
        if (tmc.game.Name !== "TmForever") return text;

        const lines = text.split("\n");
        let out = "";
        for (let i = 0; i < lines.length; i++) {
            out += this.convertLine(lines[i]);
        }
        return out;
    }

    /**
     * generate new uuid for manialink
     * @returns
     */
    uuid(): string {
        this.manialinkUUID += 1;
        const prefix = tmc.game.Name === "TmForever" ? "" : "tmc";
        // tmc.debug('¤info¤new manialink uuid: ¤white¤' + prefix + this.manialinkUUID.toString());
        return prefix + this.manialinkUUID.toString();
    }

    /**
     * hash string
     * @ignore
     * @param str
     * @returns
     */
    hash(str: string): number {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 4) - hash + char;
            hash |= 0;
        }
        return hash;
    }
    /**
     * Add manialink action
     * @param callback
     * @param data
     */
    addAction(callback: ActionCallback, data: any): string {
        const getHash = () => {
            const salt = Math.random().toString(36).substring(2, 12);
            return this.hash(salt);
        };
        let iHash = getHash();
        const prefix = tmc.game.Name === "TmForever" ? "" : "tmc";
        if (this.actions[prefix + iHash.toString()]) {
            while (this.actions[prefix + iHash.toString()]) {
                tmc.debug(`¤error¤action already exists: ¤white¤${iHash}¤white¤ increase and trying again...`);
                iHash += 1;
            }
        }
        const hash = prefix + iHash.toString();
        this.actions[hash] = { callback: callback, data: data };
        // tmc.debug('¤info¤Added action: ¤white¤' + hash + ' ¤info¤total actions: ¤white¤' + Object.keys(this.actions).length.toString());
        return hash;
    }

    /**
     * remove manialink action
     * @param actionId
     */
    removeAction(actionId: string) {
        if (this.actions[actionId]) {
            delete this.actions[actionId];
            // tmc.debug('¤info¤deleted action: ¤white¤' + actionId + ' ¤info¤total actions: ¤white¤' + Object.keys(this.actions).length.toString());
        } else {
            // tmc.debug("¤error¤action not found: " + actionId);
        }
    }

    /** @ignore */
    private async onManialinkAnswer(data: any) {
        const login = data[1];
        const answer = data[2].toString();
        const entries = data[3] ?? [];
        if (answer === "-2") {
            if (!this.hiddenManialinks.includes(login)) {
                this.hiddenManialinks.push(login);
                let hide = '<?xml version="1.0" encoding="UTF-8"?><manialinks>';
                for (const manialink of Object.values(this.publicManialinks)) {
                    if (manialink.canHide) {
                        hide += `<manialink id="${manialink.id}"></manialink>`;
                    }
                }
                for (const manialink of Object.values(this.playerManialinks[login])) {
                    if (manialink.canHide) {
                        hide += `<manialink id="${manialink.id}"></manialink>`;
                    }
                }
                hide += "</manialinks>";
                tmc.server.send("SendDisplayManialinkPageToLogin", login, hide, 0, false);
            } else {
                this.hiddenManialinks.splice(this.hiddenManialinks.indexOf(login), 1);
                await this.onPlayerConnect([login]);
            }
            return;
        }
        if (this.actions[answer]) {
            await this.actions[answer].callback(login, this.actions[answer].data, parseEntries(entries));
        }
    }

    /** @ignore */
    private async onPlayerConnect(data: any) {
        const login = data[0];

        const multi = [["SendDisplayManialinkPage", this.convert(this.getGlobalManialink()), 0, false]];
        for (const manialink of Object.values(this.publicManialinks)) {
            const render = await (manialink as IManialink).render();
            const xml = `<?xml version="1.0" encoding="UTF-8"?><manialinks>${this.convert(render)}</manialinks>`;
            multi.push(["SendDisplayManialinkPageToLogin", login, xml, manialink.displayDuration, false]);
        }
        if (this.playerManialinks[login] === undefined) this.playerManialinks[login] = {};

        for (const manialink of Object.values(this.playerManialinks[login])) {
            const render = await (manialink as IManialink).render();
            const xml = `<?xml version="1.0" encoding="UTF-8"?><manialinks>${this.convert(render)}</manialinks>`;
            multi.push(["SendDisplayManialinkPageToLogin", login, xml, manialink.displayDuration, false]);
        }
        tmc.server.multicall(multi);

        if (tmc.game.Name === "TmForever") {
            this.sendTmnfCustomUI();
        }
    }

    /** @ignore */
    private async onPlayerDisconnect(data: any) {
        const login = data[0];

        if (this.hiddenManialinks.includes(login)) {
            this.hiddenManialinks.splice(this.hiddenManialinks.indexOf(login), 1);
        }

        if (!this.playerManialinks[login]) return;

        for (const manialink of Object.values(this.playerManialinks[login])) {
            const id = manialink.id;
            manialink.destroy();
            delete this.playerManialinks[login][id];
        }
    }

    /**
     * Display manialink
     * @param manialink
     */
    async displayManialink(manialink: IManialink) {
        if (!manialink) return;

        // Handle registration: public or player-specific
        if (manialink.recipient === undefined) {
            // For public manialinks: if an older one exists, destroy it.
            if (this.publicManialinks[manialink.id] && this.publicManialinks[manialink.id] !== manialink) {
                tmc.debug(`¤error¤destroying old manialink: ¤white¤${manialink.id}`);
                this.publicManialinks[manialink.id].destroy();
            }
            this.publicManialinks[manialink.id] = manialink;
        } else {
            // Ensure there is an object container for this recipient.
            if (!this.playerManialinks[manialink.recipient]) {
                this.playerManialinks[manialink.recipient] = {};
            }

            // ensure only one window of each type per player
            const playerWindows = Object.values(this.playerManialinks[manialink.recipient]).filter((ml) => ml instanceof Window) as Window[];
            if (playerWindows.find((win) => win.name === (manialink as Window).name)) {
                return;
            }

            if (tmc.game.Name === "TmForever") {
                // If manialink is a NewWindow, destroy all existing windows for this recipient.
                if (manialink instanceof Window) {
                    const windows = Object.values(this.playerManialinks[manialink.recipient]).filter((ml) => ml instanceof Window) as Window[];
                    await Promise.all(
                        windows.map(async (win) => {
                            if (win.recipient !== undefined) {
                                const id = win.id;
                                const recipient = win.recipient;
                                win.destroy();
                                delete this.playerManialinks[recipient][id.toString()];
                            }
                        }),
                    );
                }
            }

            // If an existing manialink with the same id is present, destroy it.
            if (this.playerManialinks[manialink.recipient][manialink.id] && this.playerManialinks[manialink.recipient][manialink.id] !== manialink) {
                tmc.debug(`¤error¤destroying old player manialink: ¤white¤${manialink.id}`);
                await this.playerManialinks[manialink.recipient][manialink.id].destroy();
            }
            this.playerManialinks[manialink.recipient][manialink.id] = manialink;
        }

        // Render the manialink and build the XML payload.
        const render = await manialink.render();
        const xml = `<?xml version="1.0" encoding="UTF-8"?><manialinks>${this.convert(render)}</manialinks>`;
        // console.log("--render--");
        // console.log(render);
        // console.log("--xml--");
        // console.log(xml);

        // Dispatch the manialink depending on whether it is public or player-specific.
        if (manialink.recipient !== undefined) {
            if (!this.hiddenManialinks.includes(manialink.recipient) || !manialink.canHide) {
                tmc.server.send("SendDisplayManialinkPageToLogin", manialink.recipient, xml, manialink.displayDuration, false);
            }
        } else {
            if (this.hiddenManialinks.length > 0) {
                const logins = tmc.players.getAllLogins();
                const recipients = logins.filter((login: string) => !this.hiddenManialinks.includes(login) || !manialink.canHide);
                tmc.server.send("SendDisplayManialinkPageToLogin", recipients.join(","), xml, manialink.displayDuration, false);
            } else {
                tmc.server.send("SendDisplayManialinkPage", xml, manialink.displayDuration, false);
            }
        }
    }

    /**
     * Get manialinks by name,
     * returns all manialinks if name is undefined
     * @param name
     * @returns
     */
    getManialinks(name: string | undefined): Manialink[] {
        const manialinks: Manialink[] = [];
        for (const login of Object.keys(this.playerManialinks)) {
            for (const manialink of Object.values(this.playerManialinks[login])) {
                if (manialink instanceof Manialink && (manialink.name === name || name === undefined)) {
                    manialinks.push(manialink);
                }
            }
        }
        return manialinks;
    }

    getManialinkById(id: string): IManialink | undefined {
        for (const login of Object.keys(this.playerManialinks)) {
            for (const manialink of Object.values(this.playerManialinks[login])) {
                if (manialink.id === id) {
                    return manialink;
                }
            }
        }
        if (this.publicManialinks[id]) {
            return this.publicManialinks[id];
        }
        return undefined;
    }

    /**
     * Display array of manialinks
     * @param manialinks
     */
    async displayManialinks(manialinks: IManialink[]) {
        const callArray: any[] = [];

        // Process all manialinks concurrently.
        await Promise.all(
            manialinks.map(async (manialink) => {
                if (!manialink) return;
                const title = manialink.id;
                if (manialink.recipient === undefined) {
                    // Public manialinks processing.
                    if (this.publicManialinks[manialink.id] && this.publicManialinks[manialink.id] !== manialink) {
                        tmc.debug(`¤error¤destroying old manialink: ¤white¤${title}`);
                        await this.publicManialinks[manialink.id].destroy();
                    }
                    this.publicManialinks[manialink.id] = manialink;
                } else {
                    // Player-specific manialinks processing.
                    if (!this.playerManialinks[manialink.recipient]) {
                        this.playerManialinks[manialink.recipient] = {};
                    }
                    const playerWindows = Object.values(this.playerManialinks[manialink.recipient]).filter((ml) => ml instanceof Window) as Window[];
                    if (playerWindows.find((win) => win.name === (manialink as Window).name)) {
                        return;
                    }
                    if (tmc.game.Name === "TmForever") {
                        // If manialink is a NewWindow, destroy all existing windows for this recipient.
                        if (manialink instanceof Window) {
                            const windows = Object.values(this.playerManialinks[manialink.recipient]).filter((ml) => ml instanceof Window) as Window[];
                            await Promise.all(
                                windows.map(async (win) => {
                                    if (win.recipient !== undefined) {
                                        const id = win.id;
                                        const recipient = win.recipient;
                                        win.destroy();
                                        delete this.playerManialinks[recipient][id.toString()];
                                    }
                                }),
                            );
                        }
                    }

                    // Destroy any existing manialink with the same id.
                    if (
                        this.playerManialinks[manialink.recipient][manialink.id] &&
                        this.playerManialinks[manialink.recipient][manialink.id] !== manialink
                    ) {
                        tmc.debug(`¤error¤destroying old manialink: ¤white¤${title}`);
                        await this.playerManialinks[manialink.recipient][manialink.id].destroy();
                    }
                    this.playerManialinks[manialink.recipient][manialink.id] = manialink;
                }

                // Render the manialink concurrently.
                const render = await manialink.render();
                const xmlContent = `<?xml version="1.0" encoding="UTF-8"?><manialinks>${this.convert(render)}</manialinks>`;

                // Build the call array entry based on the recipient.
                if (manialink.recipient !== undefined) {
                    if (!this.hiddenManialinks.includes(manialink.recipient) || !manialink.canHide) {
                        callArray.push(["SendDisplayManialinkPageToLogin", manialink.recipient, xmlContent, manialink.displayDuration, false]);
                    }
                } else {
                    // For public manialinks, check if there are hidden manialinks.
                    if (this.hiddenManialinks.length > 0) {
                        // Retrieve logins and filter out those with hidden manialinks.
                        const logins = tmc.players.getAll().map((player) => player.login);
                        const recipients = logins.filter((login: string) => !this.hiddenManialinks.includes(login) || !manialink.canHide);
                        callArray.push(["SendDisplayManialinkPageToLogin", recipients.join(","), xmlContent, manialink.displayDuration, false]);
                    } else {
                        callArray.push(["SendDisplayManialinkPage", xmlContent, manialink.displayDuration, false]);
                    }
                }
            }),
        );

        // Chunk the calls into groups (e.g., 25 per batch) to prevent flooding.
        const chunks = chunkArray(callArray, 15);
        await Promise.all(
            chunks.map(async (calls) => {
                await tmc.server.multisend(calls).catch((e: any) => {
                    tmc.cli(`¤error¤error while displaying manialinks: ¤white¤${e}`);
                });
            }),
        );
    }

    /**
     * Refresh manialink
     * @param manialink
     */
    async refreshManialink(manialink: IManialink) {
        const render = await manialink.render();
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <manialinks>${this.convert(render)}</manialinks>`;
        if (manialink.recipient !== undefined) {
            if (!this.hiddenManialinks.includes(manialink.recipient) || !manialink.canHide) {
                tmc.server.send("SendDisplayManialinkPageToLogin", manialink.recipient, xml, manialink.displayDuration, false);
            }
        } else {
            if (this.hiddenManialinks.length > 0) {
                const logins = tmc.players.getAllLogins();
                const recipients = logins.filter((login) => !this.hiddenManialinks.includes(login) || !manialink.canHide);
                tmc.server.send("SendDisplayManialinkPageToLogin", recipients.join(","), xml, manialink.displayDuration, false);
            } else {
                tmc.server.send("SendDisplayManialinkPage", xml, manialink.displayDuration, false);
            }
        }
    }

    /**
     * Hide manialink
     * @param manialink
     */
    async hideManialink(manialink: IManialink) {
        try {
            // const title = manialink.title || manialink.template || manialink.id;
            // tmc.debug('¤info¤hiding manialink: ¤white¤' + title);
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <manialinks><manialink id="${manialink.id}"></manialink></manialinks>`;
            if (manialink.recipient !== undefined) {
                tmc.server.send("SendDisplayManialinkPageToLogin", manialink.recipient, xml, 0, false);
                return;
            }
            tmc.server.send("SendDisplayManialinkPage", xml, 0, false);
        } catch (e) {
            tmc.debug(e);
        }
    }

    async destroyManialink(manialink: IManialink, hide = true) {
        const title = (manialink as any).title || manialink.id;
        tmc.debug(`$f00destroying manialink: ¤white¤${title}`);
        if (hide) {
            this.hideManialink(manialink);
        }
        for (const id in manialink.actions) {
            this.removeAction(manialink.actions[id]);
        }
        const recipient = manialink.recipient;
        const uid = manialink.id;

        manialink.cleanReferences();

        if (recipient !== undefined) {
            for (const login of Object.keys(this.playerManialinks)) {
                if (this.playerManialinks[login][uid]) {
                    delete this.playerManialinks[login][uid];
                }
            }
        } else {
            for (const id of Object.keys(this.publicManialinks)) {
                if (id === uid) {
                    delete this.publicManialinks[id];
                }
            }
        }

    }
    /** set clipboard content for user */
    setClipboard(login: string, text: string) {
        if (login === undefined) return;
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <manialinks>
        <manialink id="${this.uuid()}" version="3">
        <script><!--
        main() {
            System.ClipboardSet("${text.replace(/"/g, '\\"').replaceAll("--", "—-")}");
        }
        --></script>
        </manialink>
        </manialinks>`;
        tmc.server.send("SendDisplayManialinkPageToLogin", login, xml, 1000, false);
    }

    setCustomUI(key: string, value: boolean) {
        if (this.tmnfCustomUi[key]) {
            this.tmnfCustomUi[key] = value;
            this.sendTmnfCustomUI();
        } else {
            tmc.cli(`¤error¤invalid key: ¤white¤${key}¤error¤ for custom ui`);
        }
    }

    getCustomUI() {
        return this.tmnfCustomUi;
    }

    async uiSettingsChange(value: string, oldValue: boolean, _key: string) {
        const key = _key.replace("tmf.hud.", "");
        if (Object.keys(this.tmnfCustomUi).includes(key)) {
            this.tmnfCustomUi[key] = value;
            this.sendTmnfCustomUI();
        }
    }

    async syncTmfHudSettings() {
        const keys = Object.keys(this.tmnfCustomUi);
        for (const key of keys) {
            const value = tmc.settings.get(`tmf.hud.${key}`);
            if (value === undefined) continue;
            this.tmnfCustomUi[key] = value;
        }
        this.sendTmnfCustomUI();
    }

    sendTmnfCustomUI() {
        if (tmc.game.Name === "TmForever") {
            let xml = `<?xml version="1.0" encoding="UTF-8"?>
        <manialinks><custom_ui>`;
            for (const key in this.tmnfCustomUi) {
                xml += `<${key} visible="${this.tmnfCustomUi[key] ? "true" : "false"}" />`;
            }
            xml += "</custom_ui></manialinks>";
            tmc.server.send("SendDisplayManialinkPage", xml, 0, false);
        }
    }

    getGlobalManialink() {
        const action = this.addAction(async (login: string, _data: any) => {
            if (!this.hiddenManialinks.includes(login)) {
                this.hiddenManialinks.push(login);
                let hide = '<?xml version="1.0" encoding="UTF-8"?><manialinks>';
                for (const manialink of Object.values(this.publicManialinks)) {
                    if (manialink.canHide) {
                        hide += `<manialink id="${manialink.id}"></manialink>`;
                    }
                }
                for (const manialink of Object.values(this.playerManialinks[login])) {
                    if (manialink.canHide) {
                        hide += `<manialink id="${manialink.id}"></manialink>`;
                    }
                }
                hide += "</manialinks>";
                tmc.server.send("SendDisplayManialinkPageToLogin", login, hide, 0, false);
            } else {
                this.hiddenManialinks.splice(this.hiddenManialinks.indexOf(login), 1);
                await this.onPlayerConnect([login]);
            }
        }, null);

        return `
        <?xml version="1.0" encoding="UTF-8"?>
        <manialinks>
        <manialink id="1" version="3">
            <frame pos="900 900" z-index="1">
                <label pos="0 0" size="0 0" valign="center2" halign="center" textsize="0.5" textcolor="fff" text=" " focusareacolor1="0000" focusareacolor2="0000" actionkey="3" action="${action}"/>
            </frame>
        </manialink>
        </manialinks>`;
    }
}
