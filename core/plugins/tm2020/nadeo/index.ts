import Plugin from '../../../plugins';

interface TokenResponse {
	accessToken: string;
	refreshToken: string;
}

interface NadeoErrorResponse {
	code: string;
	correlation_id: string;
	message: string;
}

enum AUDIENCES {
	NadeoServices = "NadeoServices",
	NadeoLiveServices = "NadeoLiveServices",
	NadeoClubServices = "NadeoClubServices"
}

export default class Nadeo extends Plugin {
	static depends: string[] = ["game:Trackmania"];

	readonly toolName: string = "MINIcontrol / marijn.regterschot@gmail.com";
	readonly commonHeader = {
		"Content-Type": "application/json",
		"User-Agent": this.toolName
	};

	readonly SERVER_NAME = process.env.SERVER_NAME;
	readonly SERVER_PASS = process.env.SERVER_PASS;

	readonly AUDIENCE_NADEOSERVICES = "NadeoServices";
	readonly AUDIENCE_LIVESERVICES = "NadeoLiveServices";
	readonly AUDIENCE_CLUBSERVICES = "NadeoClubServices";

	readonly CORE_URL = "https://prod.trackmania.core.nadeo.online";
	readonly LIVE_URL = "https://live-services.trackmania.nadeo.live";

	private tokens: {
		[key in AUDIENCES]: (TokenResponse & { expire: number }) | undefined;
	} = {
		"NadeoServices": undefined,
		"NadeoLiveServices": undefined,
		"NadeoClubServices": undefined
	};

	async onLoad() {
		if (!this.SERVER_NAME || !this.SERVER_PASS) {
			tmc.chat("¤error¤Nadeo: Cannot enable plugin - Server name and/or password was not set, please check your .env file.")
			await tmc.unloadPlugin("tm2020/nadeo");
		}
	}
	
	async onUnload() {
	}

	async onStart() {
	}

	async getToken(audience: AUDIENCES, login: string) {
		if (!this.tokens[audience] || this.tokens[audience].expire < Math.round(Date.now() / 1000)) {
			this.tokens[audience] = await this.updateToken(audience, login);
		}
		return this.tokens[audience]?.accessToken;
	}

	async updateToken(audience: AUDIENCES, login: string) {
		const tokens = await this.loginDedicatedServer(audience, login);
		if (!tokens) return;
		return Object.assign(tokens, { expire: Math.round(Date.now() / 1000) + 3600 });
	}

	async loginDedicatedServer(audience: AUDIENCES, login: string) {
		const headers = Object.assign(this.commonHeader, {
			"Authorization": `Basic ${Buffer.from(`${this.SERVER_NAME}:${this.SERVER_PASS}`).toString("base64")}` 
		});
		const body = JSON.stringify({ audience });
		const response = await fetch(`${this.CORE_URL}/v2/authentication/token/basic`, { method: "POST", headers, body });
		const data = await response.json() as TokenResponse | NadeoErrorResponse;
		if ("code" in data) {
			tmc.chat(`¤error¤Could not login with dedicated server account - ${data.message}`, login);
			return;
		}
		return data;
	}
}