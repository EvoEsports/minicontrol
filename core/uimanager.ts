import type Manialink from "./ui/manialink";
import Window from "./ui/window";
import { chunkArray, parseEntries } from "./utils";

export interface uiModule {
    id: string;
    position: number[];
    scale: number;
    visible: boolean;
}

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
    private publicManialinks: { [key: string]: Manialink } = {};
    private playerManialinks: { [login: string]: { [id: string]: Manialink } } = {};
    // starting uuid for manialink
    private manialinkUUID = 2;
    // array of logins that have hidden manialinks
    private hiddenManialinks: string[] = [];
    private uiProperties: uiModule[] = [];

    private scriptCalls: string[] = [];
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
            tmc.server.addListener("Common.UIModules.Properties", this.onCallbackArray, this);
            await this.getUiProperties();
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
            await this.sendUiProperties();
        }
        tmc.server.send("SendDisplayManialinkPage", this.convert(this.getGlobalManialink()), 0, false);
    }

    async getUiProperties() {
        const uuid = this.uuid();
        this.scriptCalls.push(uuid);
        tmc.server.sendScript("Common.UIModules.GetProperties", uuid);
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

    async sendUiProperties() {
        tmc.server.send("TriggerModeScriptEventArray", "Common.UIModules.SetProperties", [`{"uimodules": ${JSON.stringify(this.uiProperties)}}`]);
    }

    private async onCallbackArray(data: any) {
        if (data && this.scriptCalls.includes(data.responseid)) {
            this.scriptCalls.splice(this.scriptCalls.indexOf(data.responseid), 1);
            if (data.uimodules) {
                this.uiProperties = data.uimodules as uiModule[];
                const reset: string[] = [];
                for (const uiModule of this.uiProperties) {
                    reset.push(uiModule.id);
                }
                const json = {
                    uimodules: reset,
                };
                tmc.server.sendScript("Common.UIModules.ResetProperties", `${JSON.stringify(json)}`);
            }
        }
    }

    /**
     * @ignore
     * @param line
     * @returns
     */
    private convertLine(line: string): string {
        const matches = line.matchAll(/(pos|size)="([-.\d]+)\s+([-.\d]+)"/g);
        let out = line;
        for (const match of matches) {
            const x = (Number.parseFloat(match[2]) / 160) * 64;
            const y = (Number.parseFloat(match[3]) / 90) * 48;
            let z = 0;
            const zindex = line.match(/z-index="([\-\d]+)"/) || ["0", "0"];
            z = Number.parseInt(zindex[1]) ?? 1;
            if (match[1] === "pos") {
                out = out.replaceAll(match[0], `${match[1]}n="${x} ${y} ${z}"`).replace(/z-index="[-\d]+"/, "");
            } else if (match[1] === "size") {
                out = out.replaceAll(match[0], `${match[1]}n="${x} ${y}"`);
            }
        }
        return out;
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
    addAction(callback: CallableFunction, data: any): string {
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
        const entries = data[3];
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
            await this.actions[answer].callback(login, this.actions[answer].data, entries);
        }
    }

    /** @ignore */
    private async onPlayerConnect(data: any) {
        const login = data[0];

        const multi = [["SendDisplayManialinkPage", this.convert(this.getGlobalManialink()), 0, false]];
        for (const manialink of Object.values(this.publicManialinks)) {
            const render = await (manialink as Manialink).render();
            const xml = `<?xml version="1.0" encoding="UTF-8"?><manialinks>${this.convert(render)}</manialinks>`;
            multi.push(["SendDisplayManialinkPageToLogin", login, xml, manialink.displayDuration, false]);
        }
        if (this.playerManialinks[login] === undefined) this.playerManialinks[login] = {};

        for (const manialink of Object.values(this.playerManialinks[login])) {
            const render = await (manialink as Manialink).render();
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
    async displayManialink(manialink: Manialink) {
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

            // If manialink is a Window, destroy all existing windows for this recipient.
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
     * Display array of manialinks
     * @param manialinks
     */
    async displayManialinks(manialinks: Manialink[]) {
        const callArray: any[] = [];

        // Process all manialinks concurrently.
        await Promise.all(
            manialinks.map(async (manialink) => {
                if (!manialink) return;
                const title = manialink.title || manialink.template || manialink.id;
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

                    // If it's a Window, destroy all existing windows for that recipient.
                    if (manialink instanceof Window) {
                        const windows = Object.values(this.playerManialinks[manialink.recipient]).filter((ml) => ml instanceof Window) as Window[];
                        await Promise.all(
                            windows.map(async (win) => {
                                if (win.recipient !== undefined) {
                                    const id = win.id;
                                    const recipient = win.recipient;
                                    win.destroy();
                                    delete this.playerManialinks[recipient][id];
                                }
                            }),
                        );
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
    async refreshManialink(manialink: Manialink) {
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
    async hideManialink(manialink: Manialink) {
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

    async destroyManialink(manialink: Manialink, hide = true) {
        const title = manialink.title || manialink.template || manialink.id;
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
        return `
        <?xml version="1.0" encoding="UTF-8"?>
        <manialinks>
        <manialink id="1" version="3">
            <frame pos="-152.5 -36" z-index="1">
                <label pos="0 0" size="0 0" valign="center2" halign="center" textsize="0.5" textcolor="fff" text=" " focusareacolor1="0000" focusareacolor2="0000" actionkey="3" action="-2"/>
            </frame>
        </manialink>
        </manialinks>`;
    }
}
