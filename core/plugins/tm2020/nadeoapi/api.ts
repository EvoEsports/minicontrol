import fs from "fs";
import { sleep } from "@core/utils";

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

export default class API {
    readonly toolName: string = `MINIcontrol / ${process.env.CONTACT_INFO}`;
    readonly commonHeader = {
        "Content-Type": "application/json",
        "User-Agent": this.toolName,
    };

    readonly SERVER_LOGIN = process.env.SERVER_LOGIN;
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
                await sleep(50); // wait for dedicated server since sc is too fast
                await tmc.maps.syncMaplist();

                const info = tmc.maps.getMap(uid);
                if (info) {
                    const author = info.AuthorNickname || info.Author || "n/a";
                    tmc.chat(`¤info¤Added map ¤white¤${info.Name} ¤info¤by ¤white¤${author}!`);
                    if (Object.keys(tmc.plugins).includes("jukebox")) {
                        await tmc.chatCmd.execute(login, `/addqueue ${info.UId}`);
                    }
                    return;
                } else {
                    tmc.chat(`¤info¤Added map but couldn't find map info!`);
                }
            } catch (e: any) {
                tmc.chat(e, login);
                return;
            }
        }

        if (!fs.existsSync(`${tmc.mapsPath}nadeo/`)) fs.mkdirSync(`${tmc.mapsPath}nadeo/`);
        const abuffer = await (await res.blob()).arrayBuffer();

        fs.writeFileSync(`${tmc.mapsPath}${filePath}`, Buffer.from(abuffer));
        await tmc.server.call("AddMap", filePath);
        await sleep(50); // wait for dedicated server since sc is too fast
        await tmc.maps.syncMaplist();
        const info = tmc.maps.getMap(uid);
        if (info) {
            const author = info.AuthorNickname || info.Author || "n/a";
            tmc.chat(`¤info¤Added map ¤white¤${info.Name} ¤info¤by ¤white¤${author}!`);
            if (Object.keys(tmc.plugins).includes("jukebox")) {
                await tmc.chatCmd.execute(login, `/addqueue ${info.UId}`);
            }
            return;
        } else {
            tmc.chat(`¤info¤Added map but couldn't find map info!`);
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
            Authorization: `Basic ${Buffer.from(`${this.SERVER_LOGIN}:${this.SERVER_PASS}`).toString("base64")}`,
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
