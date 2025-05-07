import Plugin from '../..';
import API from './api';

export default class NadeoAPI extends Plugin {
    static depends: string[] = ['game:Trackmania', 'tm2020'];

    private api: API = new API();

    async onLoad() {
        if (!process.env.SERVER_LOGIN || !process.env.SERVER_PASS) {
            tmc.chat('¤error¤NadeoAPI: Cannot enable plugin - Server name and/or password was not set, please check your .env file.');
            return await tmc.unloadPlugin('tm2020/nadeoapi');
        }

        if (!process.env.CONTACT_INFO) {
            tmc.chat('¤error¤NadeoAPI: Cannot enable plugin - Contact info was not set, please check your .env file.');
            return await tmc.unloadPlugin('tm2020/nadeoapi');
        }

        tmc.addCommand('//addcampaign', this.addClubCampaign.bind(this), 'Add a campaign from a club');
    }

    async onUnload() {
        tmc.removeCommand('//addcampaign');
    }

    async addClubCampaign(login: string, params: string[]) {
        if (params.length < 2) {
            tmc.chat('¤info¤Usage: ¤cmd¤//addcampaign ¤white¤<clubId> <campaignId>', login);
            return;
        }

        const campaign = await this.api.getClubCampaign(Number.parseInt(params[0]), Number.parseInt(params[1]), login);
        if (!campaign) return;
        const playlist = campaign.campaign.playlist.map((p) => p.mapUid);
        await this.api.downloadMaps(playlist, login);
    }
}
