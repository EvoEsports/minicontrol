import Plugin from '@core/plugins';
import RecordsWindow from '@core/plugins/records/recordsWindow';
import { clone, formatTime } from '@core/utils';
import API from '@core/plugins/tm2020/nadeoapi/api';

interface AccessTokenResponse {
    access_token: string;
}

interface LeaderboardEntry {
    position: number;
    accountId: string;
    score: number;
    zoneName: string;
}

const requiredEnvVars = ['SERVER_LOGIN', 'SERVER_PASS', 'CONTACT_INFO', 'IDENTIFIER', 'SECRET'];

export default class worldRecords extends Plugin {
    static depends: string[] = ['game:Trackmania'];

    maxRecords = 100; // Amount of World Records to be displayed in /worldrecords. Increasing this might get your Account banned (too many API calls).
    length: number = this.maxRecords > 1 ? this.maxRecords : 100;
    updateRecords = 60; // Interval of World Records being updated in seconds (min. 30). Decreasing this might get your Account banned (too many API calls).
    interval: number = this.updateRecords >= 30 ? this.updateRecords * 1000 : 60000;
    private api: API = new API();
    private cachedLeaderboard: LeaderboardEntry[] = [];
    private displayNamesCache: { [key: string]: string } = {};
    private worldRecordsUpdate: NodeJS.Timeout | null = null;
    envIdentifier:string = '';
    envSecret:string = '';

    async onLoad() {
        const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
        if (missingVars.length > 0) {
            tmc.cli(`¤error¤Missing required environment variables: ${missingVars.join(', ')}`);
            process.exit(1);
        }
        this.envIdentifier = process.env.IDENTIFIER || '';
        this.envSecret = process.env.SECRET || '';

        tmc.server.addListener('Trackmania.BeginMap', this.onMapChanged, this);
        tmc.addCommand('/worldrecords', this.cmdRecords.bind(this), 'Display World Records');
    }

    async onUnload() {
        tmc.removeCommand('/worldrecords');
        tmc.server.removeListener('Trackmania.BeginMap', this.onMapChanged);
        if (this.worldRecordsUpdate) {
            clearInterval(this.worldRecordsUpdate);
            this.worldRecordsUpdate = null;
        }
    }

    async onMapChanged() {
        await this.fetchWorldRecords();
        if (this.worldRecordsUpdate) {
            clearInterval(this.worldRecordsUpdate);
        }
        this.startWorldRecordsUpdate();
    }

    async onStart() {
        const menu = tmc.storage['menu'];
        if (menu) {
            menu.addItem({
                category: 'Records',
                title: 'Show: World Records',
                action: '/worldrecords'
            });
        }
        await this.fetchWorldRecords();
        if (this.worldRecordsUpdate) {
            clearInterval(this.worldRecordsUpdate);
        }
        this.startWorldRecordsUpdate();
    }

    private startWorldRecordsUpdate() {
        this.worldRecordsUpdate = setInterval(async () => {
            await this.fetchWorldRecords();
        }, this.interval);
    }

    async getDisplayNames(accountIds: string[]): Promise<{ [key: string]: string }> {
        const missingAccountIds: string[] = [];

        for (const accountId of accountIds) {
            if (!this.displayNamesCache[accountId]) {
                missingAccountIds.push(accountId);
            }
        }

        if (missingAccountIds.length === 0) {
            return this.getCachedDisplayNames(accountIds);
        }

        const token = await this.getAccessToken();
        if (!token) {
            throw new Error('Failed to obtain access token');
        }

        const displayNameUrl = 'https://api.trackmania.com/api/display-names';
        const displayNamesResponse: { [key: string]: string } = {};

        for (let i = 0; i < missingAccountIds.length; i += 50) {
            const chunk = missingAccountIds.slice(i, i + 50);

            const response = await fetch(`${displayNameUrl}?accountId[]=${chunk.join('&accountId[]=')}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const responseBody = await response.text();
                throw new Error(`Failed to fetch display names: ${response.statusText}\nResponse body: ${responseBody}`);
            }

            const data = (await response.json()) as { [key: string]: string };

            Object.assign(displayNamesResponse, data);
        }

        Object.assign(this.displayNamesCache, displayNamesResponse);

        return this.getCachedDisplayNames(accountIds);
    }

    private getCachedDisplayNames(accountIds: string[]): { [key: string]: string } {
        const result: { [key: string]: string } = {};
        for (const accountId of accountIds) {
            result[accountId] = this.displayNamesCache[accountId];
        }
        return result;
    }

    async getAccessToken(): Promise<string | null> {
        const tokenUrl = 'https://api.trackmania.com/api/access_token';
        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.envIdentifier,
                client_secret: this.envSecret,
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            const responseBody = await response.text();
            throw new Error(`Failed to fetch access token: ${response.statusText}\nResponse body: ${responseBody}`);
        }

        const data = (await response.json()) as AccessTokenResponse;
        return data.access_token || null;
    }

    async fetchWorldRecords() {
        try {
            const currentMap = tmc.maps.currentMap;
            if (!currentMap) {
                console.error('No current map found, cannot fetch world records.');
                return;
            }

            const mapUid = currentMap.UId;
            const totalRecordsToFetch = this.length;
            let allLeaderboardEntries: LeaderboardEntry[] = [];

            while (allLeaderboardEntries.length < totalRecordsToFetch) {
                const length = Math.min(totalRecordsToFetch - allLeaderboardEntries.length, 100);
                const response = await this.api.getLeaderboard(mapUid, '', length, allLeaderboardEntries.length);

                if (!response || !response.tops || response.tops.length === 0) {
                    console.error('Failed to fetch world records data or no more records available!');
                    break;
                }

                const leaderboardEntries = response.tops[0].top as LeaderboardEntry[];
                allLeaderboardEntries.push(...leaderboardEntries);

                if (leaderboardEntries.length < length) {
                    break;
                }
            }

            this.cachedLeaderboard = allLeaderboardEntries;

            const accountIds = this.cachedLeaderboard.map((entry) => entry.accountId);
            await this.getDisplayNames(accountIds);

            const worldRecords: any = [];
            for (const entry of this.cachedLeaderboard) {
                worldRecords.push({
                    rank: entry.position,
                    nickname: this.displayNamesCache[entry.accountId] || 'Unknown',
                    formattedTime: formatTime(entry.score)
                });
            }

            tmc.server.emit('Plugin.WorldRecords.onSync', {
                records: clone(worldRecords)
            });
        } catch (error) {
            tmc.server.emit('Plugin.WorldRecords.onSync', {
                records: []
            });
            console.error(`Error fetching world records: ${error}`);
        }
    }

    async cmdRecords(login: string) {
        try {
            if (this.cachedLeaderboard.length === 0) {
                tmc.chat('¤error¤World records not available!', login);
                return;
            }

            const items = this.cachedLeaderboard.map((entry) => ({
                Position: entry.position,
                Name: this.displayNamesCache[entry.accountId] || entry.accountId,
                Time: formatTime(entry.score),
                Zone: entry.zoneName || 'N/A'
            }));

            const window = new RecordsWindow(login, this);
            window.title = `World Records [${this.length}]`;
            window.size = { width: 170, height: 100 };
            window.setItems(items);
            window.setColumns([
                { key: 'Position', title: '#', width: 15 },
                { key: 'Name', title: 'Name', width: 60 },
                { key: 'Zone', title: 'Zone', width: 60 },
                { key: 'Time', title: 'Time', width: 30 }
            ]);
            await window.display();
        } catch (error) {
            tmc.chat(`¤error¤An error occurred: ${error}`, login);
        }
    }

    async deleteRecord(login: string, data: any) {
        return;
    }
}
