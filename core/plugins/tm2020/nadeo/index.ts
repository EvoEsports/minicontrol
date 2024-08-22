import Plugin from "../../../plugins";
import fs from "fs";

interface Tokens {
    accessToken: string;
    refreshToken: string;
}

interface NadeoError {
    code: string;
    correlation_id: string;
    message: string;
}

interface ClubCampaign {
    campaign: {
        playlist: {
            id: number;
            position: number;
            mapUid: string;
        }[];
        [key: string]: any;
    };
    [key: string]: any;
}

interface MapInfo {
    uid: string;
    downloadUrl: string;
    [key: string]: any;
}

enum AUDIENCES {
    NadeoServices = "NadeoServices",
    NadeoLiveServices = "NadeoLiveServices",
    NadeoClubServices = "NadeoClubServices",
}

export default class Nadeo extends Plugin {
    static depends: string[] = ["game:Trackmania"];

    readonly toolName: string = "MINIcontrol / marijn.regterschot@gmail.com";
    readonly commonHeader = {
        "Content-Type": "application/json",
        "User-Agent": this.toolName,
    };

    readonly SERVER_NAME = process.env.SERVER_NAME;
    readonly SERVER_PASS = process.env.SERVER_PASS;

    readonly CORE_URL = "https://prod.trackmania.core.nadeo.online";
    readonly LIVE_URL = "https://live-services.trackmania.nadeo.live";

    private tokens: {
        [key in AUDIENCES]: (Tokens & { expire: number }) | undefined;
    } = {
        [AUDIENCES.NadeoServices]: undefined,
        [AUDIENCES.NadeoLiveServices]: undefined,
        [AUDIENCES.NadeoClubServices]: undefined,
    };

    async onLoad() {
        if (!this.SERVER_NAME || !this.SERVER_PASS) {
            tmc.chat("¤error¤Nadeo: Cannot enable plugin - Server name and/or password was not set, please check your .env file.");
            await tmc.unloadPlugin("tm2020/nadeo");
        }

        tmc.addCommand("//addcampaign", this.addClubCampaign.bind(this), "Add a campaign from a club");
    }

    async onUnload() {
        tmc.removeCommand("//addcampaign");
    }

    async onStart() {}

    async addClubCampaign(login: string, params: string[]) {
        if (params.length < 2) {
            tmc.chat("¤info¤Usage: ¤cmd¤//addcampaign ¤white¤<clubId> <campaignId>", login);
            return;
        }

        const campaign = await this.getClubCampaign(parseInt(params[0]), parseInt(params[1]), login);
        if (!campaign) return;
        const playlist = campaign.campaign.playlist.map((p) => p.mapUid);
        await this.downloadMaps(playlist, login);
    }

    async getClubCampaign(clubId: number, campaignId: number, login: string) {
        const token = await this.getToken(AUDIENCES.NadeoLiveServices, login);
        if (!token) return;
        const url = `${this.LIVE_URL}/api/token/club/${clubId}/campaign/${campaignId}`;
        return (await this.fetchUrl(url, token, login)) as ClubCampaign;
    }

    // Helper functions

    async fetchUrl(url: string, token: string, login: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: any) {
        const response = await fetch(url, {
            method,
            headers: { Authorization: `nadeo_v1 t=${token}` },
            body: JSON.stringify(body),
        });
        const data = (await response.json()) as NadeoError | any;
        if (Array.isArray(data) || "code" in data) {
            let errorMessage = "Could not fetch URL";
            if ("message" in data) errorMessage += ` - ${data.message}`;
            tmc.chat(`¤error¤${errorMessage}`, login);
            return;
        }
        return data;
    }

    async getMapInfoMultiple(mapUids: string[], login: string) {
        const token = await this.getToken(AUDIENCES.NadeoLiveServices, login);
        if (!token) return;
        const url = `${this.LIVE_URL}/api/token/map/get-multiple?mapUidList=${mapUids.join(",")}`;
        return (await this.fetchUrl(url, token, login))["mapList"] as MapInfo[];
    }

    async downloadMap(url: string, uid: string, login: string) {
        let filePath = `nadeo/${uid}.Map.Gbx`;
        const res = await fetch(url, { keepalive: false });

        if (!res || !res.ok) {
            tmc.chat(`¤error¤Could not download map with id: ${uid}`, login);
            return;
        }

        if (!fs.existsSync(tmc.mapsPath)) {
            try {
                const abuffer = await (await res.blob()).arrayBuffer();
                const status = await tmc.server.call("WriteFile", filePath, Buffer.from(abuffer));
                if (!status) {
                    tmc.chat(`¤error¤Map path "${tmc.mapsPath}" is unreachable`, login);
                    return;
                }
                await tmc.server.call("AddMap", filePath);
                await tmc.maps.syncMaplist();

                const info = await tmc.server.call("GetMapInfo", `${tmc.mapsPath}${filePath}`);
                const author = info.AuthorNickname || info.Author || "n/a";
                tmc.chat(`¤info¤Added map ¤white¤${info.Name} ¤info¤by ¤white¤${author}!`);
                if (Object.keys(tmc.plugins).includes("maps")) {
                    await tmc.chatCmd.execute(login, `/addqueue ${info.UId}`);
                }
                return;
            } catch (e: any) {
                tmc.chat(e, login);
                return;
            }
        }

        if (!fs.existsSync(`${tmc.mapsPath}nadeo/`)) fs.mkdirSync(`${tmc.mapsPath}nadeo/`);
        const abuffer = await (await res.blob()).arrayBuffer();

        fs.writeFileSync(`${tmc.mapsPath}${filePath}`, Buffer.from(abuffer));
        await tmc.server.call("AddMap", filePath);
        await tmc.maps.syncMaplist();
        const info = await tmc.server.call("GetMapInfo", `${tmc.mapsPath}${filePath}`);
        const author = info.AuthorNickname || info.Author || "n/a";
        tmc.chat(`¤info¤Added map ¤white¤${info.Name} ¤info¤by ¤white¤${author}`);
        if (Object.keys(tmc.plugins).includes("maps")) {
            await tmc.chatCmd.execute(login, `/addqueue ${info.UId}`);
        }
    }

    async downloadMaps(mapUids: string[], login: string) {
        const maps = await this.getMapInfoMultiple(mapUids, login);
        if (!maps) return;
        for (const map of maps) {
            await this.downloadMap(map.downloadUrl, map.uid, login);
        }
    }

    // Nadeo authentication

    async getToken(audience: AUDIENCES, login: string) {
        if (!this.tokens[audience] || this.tokens[audience].expire < Math.round(Date.now() / 1000)) {
            this.tokens[audience] = await this.updateToken(audience, login);
        }
        return this.tokens[audience]?.accessToken;
    }

    async updateToken(audience: AUDIENCES, login: string) {
        const tokens = await this.loginDedicatedServer(audience, login);
        if (!tokens) return;
        return Object.assign(tokens, {
            expire: Math.round(Date.now() / 1000) + 3600,
        });
    }

    async loginDedicatedServer(audience: AUDIENCES, login: string) {
        const headers = Object.assign(this.commonHeader, {
            Authorization: `Basic ${Buffer.from(`${this.SERVER_NAME}:${this.SERVER_PASS}`).toString("base64")}`,
        });
        const body = JSON.stringify({ audience });
        const response = await fetch(`${this.CORE_URL}/v2/authentication/token/basic`, { method: "POST", headers, body });
        const data = (await response.json()) as Tokens | NadeoError;
        if ("code" in data) {
            tmc.chat(`¤error¤Could not login with dedicated server account - ${data.message}`, login);
            return;
        }
        return data;
    }
}
