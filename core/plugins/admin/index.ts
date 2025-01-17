import { processColorString, castType, htmlEntities } from '@core/utils';
import ModeSettingsWindow from './ModeSettingsWindow';
import Plugin from '@core/plugins';
import fs from 'fs';
import LocalMapsWindow from './LocalMapsWindow';
import PlayerListsWindow from './PlayerListsWindow';
import fsPath from 'path';
import { type Map } from '@core/mapmanager.ts';
import SettingsWindow from './SettingsWindow';
import type { Player } from '@core/playermanager';
import AdminWidget from './AdminWidget';

enum TmnfMode {
    Rounds = 0,
    TimeAttack = 1,
    Team = 2,
    Laps = 3,
    Stunts = 4,
    Cup = 5
}

interface Setting {
    key: string;
    value: any;
    default: any;
    type: 'string' | 'number' | 'boolean';
}

export default class AdminPlugin extends Plugin {
    currentSetting: { [key: string]: Setting | undefined } = {};
    adminWidget: { [key: string]: AdminWidget } = {};

    async onLoad() {
        if (tmc.game.Name != 'TmForever') {
            tmc.addCommand('//modesettings', this.cmdModeSettings.bind(this), 'Display mode settings');
        }
        tmc.settings.register('admin.panel', true, this.adminPanelChange.bind(this), 'Admin: Enable admin panel');
        tmc.server.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);
        tmc.server.addListener('TMC.PlayerDisconnect', this.onPlayerDisconnect, this);

        tmc.addCommand('//settings', this.cmdSettings.bind(this), 'Display settings');
        tmc.addCommand('//set', this.cmdSetSetting.bind(this), 'Set setting value');
        tmc.addCommand('//skip', async () => await tmc.server.call('NextMap'), 'Skips Map');
        tmc.addCommand('//res', async () => await tmc.server.call('RestartMap'), 'Restarts Map');
        tmc.addCommand(
            '//kick',
            async (login: string, params: string[]) => {
                const kickLogin: any = params.shift();
                if (!kickLogin) {
                    return tmc.chat('¤cmd¤//kick ¤info¤needs a login', login);
                }
                await tmc.server.call('Kick', kickLogin, params.join(' '));
            },
            'Kicks player'
        );
        tmc.addCommand(
            '//ban',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//ban ¤info¤needs a login', login);
                }
                await tmc.server.call('Ban', params[0]);
            },
            'Bans player'
        );
        tmc.addCommand(
            '//unban',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//unban ¤info¤needs a login', login);
                }
                await tmc.server.call('Unban', params[0]);
            },
            'Unbans player'
        );
        tmc.addCommand('//cancel', async () => await tmc.server.call('CancelVote'), 'Cancels vote');
        tmc.addCommand(
            '//er',
            async () => {
                try {
                    tmc.server.send('ForceEndRound');
                } catch (err: any) {
                    tmc.chat('¤error¤' + err.message);
                }
            },
            'Ends round'
        );
        tmc.addCommand(
            '//mode',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//mode ¤info¤needs a mode', login);
                }
                if (tmc.game.Name == 'TmForever') {
                    const modes: { [key: string]: number } = {
                        rounds: 0,
                        ta: 1,
                        team: 2,
                        laps: 3,
                        stunts: 4,
                        cup: 5
                    };
                    if (modes[params[0]] === undefined) {
                        return tmc.chat('¤cmd¤//mode ¤info¤needs a valid mode', login);
                    }
                    tmc.chat(`Gamemode set to ${params[0]}`);
                    await tmc.server.call('SetGameMode', modes[params[0]]);
                }

                if (tmc.game.Name == 'Trackmania') {
                    const scripts: { [key: string]: string } = {
                        rounds: 'Trackmania/TM_Rounds_Online.Script.txt',
                        ta: 'Trackmania/TM_TimeAttack_Online.Script.txt',
                        team: 'Trackmania/TM_Team_Online.Script.txt',
                        laps: 'Trackmania/TM_Laps_Online.Script.txt',
                        cup: 'Trackmania/TM_Cup_Online.Script.txt'
                    };
                    if (scripts[params[0]] === undefined) {
                        return tmc.chat('¤cmd¤//mode ¤info¤needs a valid mode', login);
                    }
                    tmc.chat(`¤info¤Gamemode set to ¤white¤${params[0]}`);
                    await tmc.server.call('SetScriptName', scripts[params[0]]);
                }
            },
            'Sets gamemode'
        );
        tmc.addCommand(
            '//password',
            async (login: string, params: string[]) => {
                const newPass = params[0] || '';
                await tmc.server.call('SetServerPassword', newPass);
                await tmc.server.call('SetServerPasswordForSpectator', newPass);
                if (newPass == '') {
                    tmc.chat(`¤info¤Password removed`, login);
                } else {
                    tmc.chat(`¤info¤Password set to "¤white¤${newPass}¤info¤"`, login);
                }
            },
            'Sets server password'
        );

        tmc.addCommand(
            '//warmup',
            async (login: string, params: string[]) => {
                if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat('¤cmd¤//warmup ¤info¤needs numeric value');
                }
                tmc.chat(`¤info¤Warmup set to ¤white¤${params[0]}`, login);
                await tmc.server.call('SetAllWarmUpDuration', Number.parseInt(params[0]));
            },
            'Sets warmup duration'
        );
        tmc.addCommand(
            '//servername',
            async (login: string, params: string[]) => {
                const newName = params.join(' ');
                await tmc.server.call('SetServerName', newName);
                tmc.chat(`¤info¤Servername set to ¤white¤${newName}`, login);
            },
            "Sets server's name"
        );
        tmc.addCommand(
            '//servercomment',
            async (login: string, params: string[]) => {
                const newComment = params.join(' ');
                await tmc.server.call('SetServerComment', newComment);
                tmc.chat(`¤info¤Servercomment set to ¤white¤${newComment}`, login);
            },
            'set server comment'
        );
        tmc.addCommand(
            '//maxplayers',
            async (login: string, params: string[]) => {
                const newMax = Number.parseInt(params[0]);
                if (newMax < 0) {
                    return tmc.chat('¤cmd¤setmaxplayers ¤info¤needs a positive numeric value', login);
                }
                await tmc.server.call('SetMaxPlayers', newMax);
                tmc.chat(`¤info¤Max players set to ¤white¤${newMax}`, login);
            },
            'Sets max players'
        );

        tmc.addCommand(
            '//ignore',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//ignore ¤info¤needs a login', login);
                }
                await tmc.server.call('Ignore', params[0]);
                tmc.chat(`¤info¤Ignoring ¤white¤${params[0]}`, login);
            },
            'Ignores player'
        );

        tmc.addCommand(
            '//unignore',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//unignore ¤info¤needs a login', login);
                }
                await tmc.server.call('UnIgnore', params[0]);
                tmc.chat(`¤info¤Unignored ¤white¤${params[0]}`, login);
            },
            'Unignores player'
        );

        tmc.addCommand(
            '//talimit',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//talimit ¤info¤needs numeric value in seconds');
                }

                if (tmc.game.Name == 'TmForever') {
                    const mode = await tmc.server.call('GetGameMode');
                    if (mode == TmnfMode.TimeAttack) {
                        tmc.server.send('SetTimeAttackLimit', Number.parseInt(params[0]) * 1000);
                        tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`);
                        return;
                    }
                    if (mode == TmnfMode.Laps) {
                        tmc.server.send('SetLapsTimeLimit', Number.parseInt(params[0]) * 1000);
                        tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`);
                        return;
                    }
                    tmc.chat('¤error¤Timelimit not supported in this mode');
                    return;
                }

                if (tmc.game.Name == 'Trackmania' || tmc.game.Name == 'ManiaPlanet') {
                    const settings = { S_TimeLimit: Number.parseInt(params[0]) };
                    tmc.server.send('SetModeScriptSettings', settings);
                    tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`);
                    return;
                }
            },
            'Sets timelimit'
        );

        tmc.addCommand(
            '//jump',
            async (login: string, params: string[]) => {
                if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat('¤cmd¤//jump ¤info¤needs numeric value');
                }
                try {
                    let map: any;
                    if (params[0].toString().length < 5) {
                        let index = Number.parseInt(params[0]) - 1;
                        map = tmc.maps.getMaplist()[index];
                    } else {
                        map = tmc.maps.getMaplist().find((m: any) => m.UId == params[0]);
                    }
                    if (map) {
                        tmc.chat(`¤info¤Jumped to ¤white¤${map.Name}¤info¤ by ¤white¤${map.AuthorNickname ? map.AuthorNickname : map.Author}`);
                        await tmc.server.call('ChooseNextMap', map.FileName);
                        tmc.server.send('NextMap');
                    } else {
                        tmc.chat("¤error¤Couldn't find map", login);
                    }
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Jumps to map in playlist'
        );

        tmc.addCommand(
            '//wml',
            async (login: string, params: string[]) => {
                let file = 'tracklist.txt';
                if (params[0]) file = params[0].replace('.txt', '') + '.txt';
                try {
                    const answer = await tmc.server.call('SaveMatchSettings', 'MatchSettings/' + file);
                    if (!answer) {
                        tmc.chat(`¤error¤Couldn't save matchsettings to ¤white¤${file}`, login);
                        return;
                    }
                    tmc.chat(`¤info¤Saved matchsettings to ¤white¤${file}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Saves matchsettings'
        );

        tmc.addCommand(
            '//rml',
            async (login: string, params: string[]) => {
                let file = 'tracklist';
                if (params[0]) file = params[0].replace('.txt', '') + '.txt';
                try {
                    const answer = await tmc.server.call('LoadMatchSettings', 'MatchSettings/' + file);
                    if (!answer) {
                        tmc.chat(`¤error¤Couldn't read matchsettings from ¤white¤${file}`, login);
                        return;
                    }
                    await tmc.maps.syncMaplist();
                    tmc.chat(`¤info¤Matchsettings read from ¤white¤${file}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Reads matchsettings'
        );
        tmc.addCommand(
            '//shuffle',
            async (login: string, params: string[]) => {
                try {
                    let maps: Map[] = await tmc.server.call('GetMapList', -1, 0);
                    maps = maps.sort(() => Math.random() - 0.5);
                    let toserver: string[] = [];
                    for (const map of maps) {
                        toserver.push(map.FileName);
                    }
                    await tmc.server.call('RemoveMapList', toserver);
                    tmc.server.send('AddMapList', toserver);
                    await tmc.maps.syncMaplist();
                    tmc.chat(`¤info¤Maplist Shuffled.`);
                } catch (err: any) {
                    tmc.chat('¤error¤' + err.message, login);
                }
            },
            'Shuffles maplist'
        );
        tmc.addCommand(
            '//remove',
            async (login: string, params: string[]) => {
                let map: any = tmc.maps.currentMap;
                if (params[0] != undefined) {
                    if (params[0].toString().length < 5) {
                        let index = Number.parseInt(params[0]) - 1;
                        map = tmc.maps.getMaplist()[index];
                    } else {
                        map = tmc.maps.getMaplist().find((m: any) => m.UId == params[0]);
                    }
                }

                try {
                    if (!map) {
                        tmc.chat(`¤error¤Couldn't find map`, login);
                        return;
                    }
                    await tmc.server.call('RemoveMap', map.FileName);
                    tmc.maps.removeMap(map.UId);
                    tmc.chat(`¤info¤Removed map ¤white¤${map.Name} ¤info¤from the playlist.`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Removes map from playlist'
        );

        tmc.addCommand(
            '//call',
            async (login: string, params: string[]) => {
                const method = params.shift();
                if (method === undefined) {
                    return tmc.chat('¤cmd¤//call ¤info¤needs a method', login);
                }
                try {
                    let out: any = [];
                    for (let i = 0; i < params.length; i++) {
                        if (params[i].toLowerCase() == 'true') out[i] = true;
                        else if (params[i].toLowerCase() == 'false') out[i] = false;
                        else if (!isNaN(Number.parseInt(params[i]))) out[i] = Number.parseInt(params[i]);
                        else out[i] = params[i];
                    }
                    const answer = await tmc.server.call(method, ...out);
                    tmc.chat(answer.toString(), login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Calls server method'
        );
        tmc.addCommand(
            '//wu',
            async (login: string, params: string[]) => {
                if (tmc.game.Name == 'TmForever') {
                    tmc.server.send('SetWarmUp', true);
                }
            },
            'Starts warmup'
        );
        tmc.addCommand(
            '//endwu',
            async (login: string, params: string[]) => {
                if (tmc.game.Name == 'TmForever') {
                    tmc.server.send('SetWarmUp', false);
                } else {
                    tmc.server.callScript('Trackmania.WarmUp.ForceStop');
                }
            },
            'end warmup'
        );
        tmc.addCommand(
            '//timeout',
            async (login: string, params: string[]) => {
                if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat('¤cmd¤//timeout ¤info¤needs numeric value', login);
                }
                try {
                    tmc.server.send('SetFinishTimeout', Number.parseInt(params[0]) * 1000);
                    tmc.chat(`¤info¤Timeout set to ¤white¤${params[0]} ¤info¤seconds`);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Set finish timeout for rounds'
        );
        tmc.addCommand(
            '//cupwinners',
            async (login: string, params: string[]) => {
                if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat('¤cmd¤//cupwinners ¤info¤needs numeric value', login);
                }
                try {
                    tmc.server.send('SetCupNbWinners', Number.parseInt(params[0]));
                    tmc.chat(`¤info¤Cup winners set to ¤white¤${params[0]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Set cup winners'
        );
        tmc.addCommand(
            '//forceteam',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//forceteam ¤info¤needs a login', login);
                }
                if (!params[1]) {
                    return tmc.chat('¤cmd¤//forceteam ¤info¤needs a team', login);
                }
                try {
                    tmc.server.send('ForcePlayerTeam', params[0], params[1]);
                    tmc.chat(`¤info¤Forced ¤white¤${params[0]} ¤info¤to team ${params[1]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Force player to team'
        );

        tmc.addCommand(
            '//pointlimit',
            async (login: string, params: string[]) => {
                if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat('¤cmd¤//pointlimit ¤info¤needs numeric value', login);
                }
                try {
                    const mode = await tmc.server.call('GetGameMode');
                    switch (mode) {
                        case TmnfMode.Team: {
                            tmc.server.send('SetTeamPointsLimit', Number.parseInt(params[0]));
                            tmc.chat(`¤info¤Team points limit set to ¤white¤${params[0]}`, login);
                            break;
                        }
                        case TmnfMode.Rounds: {
                            tmc.server.send('SetRoundPointsLimit', Number.parseInt(params[0]));
                            tmc.chat(`¤info¤Rounds limit set to ¤white¤${params[0]}`, login);
                            break;
                        }
                        case TmnfMode.Cup: {
                            tmc.server.send('SetCupPointsLimit', Number.parseInt(params[0]));
                            tmc.chat(`¤info¤Cup points limit set to ¤white¤${params[0]}`, login);
                            break;
                        }
                    }
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Set points limit'
        );
        tmc.addCommand(
            '//maxpoints',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//maxpoints ¤info¤needs value', login);
                }
                try {
                    tmc.server.send('SetMaxPointsTeam', Number.parseInt(params[0]));
                    tmc.chat(`¤info¤Max points set to ¤white¤${params[0]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Set team max points'
        );
        tmc.addCommand('//rpoints', async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat('¤cmd¤//rpoints ¤info¤needs value', login);
            }
            const array = params[0].split(',');
            if (array.length < 2) {
                return tmc.chat('¤cmd¤//rpoints ¤info¤needs atleast 2 values', login);
            }
            let newArray: number[] = [];
            for (let number of array) {
                if (!isNaN(Number.parseInt(number.trim()))) {
                    newArray.push(parseInt(number.trim()));
                }
            }
            try {
                tmc.server.send(
                    'SetRoundCustomPoints',
                    newArray.sort((a, b) => a - b)
                );
                tmc.chat(`¤info¤Rounds points set to ¤white¤${params[0]}`, login);
            } catch (err: any) {
                tmc.chat(err.message, login);
            }
        });
        tmc.addCommand(
            '//usenewrules',
            async (login: string, params: string[]) => {
                const mode = await tmc.server.call('GetGameMode');

                if (params[0] == 'true') {
                    if (mode == TmnfMode.Rounds) tmc.server.send('SetUseNewRulesRound', true);
                    if (mode == TmnfMode.Team) tmc.server.send('SetUseNewRulesTeam', true);
                    tmc.chat(`¤info¤Using new rounds rules`, login);
                } else if (params[0] == 'false') {
                    if (mode == TmnfMode.Rounds) tmc.server.send('SetUseNewRulesRound', false);
                    if (mode == TmnfMode.Team) tmc.server.send('SetUseNewRulesTeam', false);
                    tmc.chat(`¤info¤Using old rounds rules`, login);
                } else {
                    tmc.chat('¤cmd¤//usenewrules ¤info¤needs a boolean value', login);
                }
            },
            'Use new rounds rules'
        );
        tmc.addCommand(
            '//laps',
            async (login: string, params: string[]) => {
                if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat('¤cmd¤//laps ¤info¤needs numeric value', login);
                }
                try {
                    tmc.server.send('SetNbLaps', Number.parseInt(params[0]));
                    tmc.chat(`¤info¤Laps set to ¤white¤${params[0]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            'Set laps'
        );

        tmc.addCommand('//addlocal', this.cmdAddLocal.bind(this), 'Adds local map to playlist');
        tmc.addCommand(
            '//modecommand',
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat('¤cmd¤//modecommand ¤info¤needs a command', login);
                }
                if (!params[1]) {
                    return tmc.chat(`¤cmd¤//modecommand ${params[0]} ¤info¤needs a parameter`, login);
                }
                const outCommand: any = {};
                outCommand['Command_' + params[0]] = castType(params[1]);

                try {
                    await tmc.server.call('SendModeScriptCommands', outCommand);
                } catch (err: any) {
                    tmc.chat('¤error¤' + err.message, login);
                }
            },
            'Send mode command'
        );
        tmc.addCommand('//guestlist', this.cmdGuestlist.bind(this), 'Manage Guestlist');
        tmc.addCommand('//blacklist', this.cmdBlacklist.bind(this), 'Manage Blacklist');
        tmc.addCommand('//ignorelist', this.cmdIgnoreList.bind(this), 'Manage Ignorelist');
        tmc.addCommand('//banlist', this.cmdBanlist.bind(this), 'Manage Banlist');
        tmc.addCommand('//togglemute', this.cmdToggleMute.bind(this), 'Toggle Mute');
    }

    async onUnload() {
        tmc.removeCommand('//timeout');
        tmc.removeCommand('//rlimit');
        tmc.removeCommand('//pointlimit');
        tmc.removeCommand('//usenewrules');
        tmc.removeCommand('//laps');
        tmc.removeCommand('//skip');
        tmc.removeCommand('//res');
        tmc.removeCommand('//kick');
        tmc.removeCommand('//ban');
        tmc.removeCommand('//unban');
        tmc.removeCommand('//cancel');
        tmc.removeCommand('//er');
        tmc.removeCommand('//mode');
        tmc.removeCommand('//setpass');
        tmc.removeCommand('//setspecpass');
        tmc.removeCommand('//warmup');
        tmc.removeCommand('//ignore');
        tmc.removeCommand('//unignore');
        tmc.removeCommand('//togglemute');
        tmc.removeCommand('//talimit');
        tmc.removeCommand('//jump');
        tmc.removeCommand('//wml');
        tmc.removeCommand('//rml');
        tmc.removeCommand('//shuffle');
        tmc.removeCommand('//remove');
        tmc.removeCommand('//call');
        tmc.removeCommand('//wu');
        tmc.removeCommand('//endwu');
        if (tmc.game.Name != 'TmForever') {
            tmc.removeCommand('//modesettings');
            tmc.removeCommand('//set');
        }
        tmc.removeCommand('//addlocal');
        tmc.removeCommand('//modecommand');
        tmc.removeCommand('//guestlist');
        tmc.removeCommand('//blacklist');
    }

    async adminPanelChange(value: any) {
        for (const player of tmc.players.getAll()) {
            await this.onPlayerConnect(player);
        }
    }

    async onStart(): Promise<void> {
        for (const player of tmc.players.getAll()) {
            await this.onPlayerConnect(player);
        }

        const menu = tmc.storage['menu'];
        if (menu) {
            menu.addItem({
                category: 'Map',
                title: 'Adm: Add',
                action: '//addlocal',
                admin: true
            });
            menu.addItem({
                category: 'Map',
                title: 'Adm: Shuffle',
                action: '//shuffle',
                admin: true
            });
            menu.addItem({
                category: 'Map',
                title: 'Adm: Write list',
                action: '//wml',
                admin: true
            });
            menu.addItem({
                category: 'Map',
                title: 'Adm: Skip',
                action: '//skip',
                admin: true
            });
            menu.addItem({
                category: 'Map',
                title: 'Adm: Restart',
                action: '//res',
                admin: true
            });

            if (tmc.game.Name == 'Trackmania') {
                menu.addItem({
                    category: 'Server',
                    title: 'ModeSettings',
                    action: '//modesettings',
                    admin: true
                });
            }
        }
    }

    async onPlayerConnect(player: Player) {
        if (!tmc.admins.includes(player.login)) return;
        if (tmc.settings.get('admin.panel')) {
            const widget = new AdminWidget(player.login);
            widget.size = { width: 60, height: 5 };
            widget.pos = { x: 35, y: -86, z: 1 };
            await widget.display();
            this.adminWidget[player.login] = widget;
        } else if (this.adminWidget[player.login]) {
            await this.adminWidget[player.login].destroy();
            delete this.adminWidget[player.login];
        }
    }

    async onPlayerDisconnect(player: Player) {
        if (this.adminWidget[player.login]) {
            delete this.adminWidget[player.login];
        }
    }

    async cmdModeSettings(login: string, args: string[]) {
        const window = new ModeSettingsWindow(login);
        window.size = { width: 160, height: 95 };
        window.title = 'Mode Settings';
        const settings = await tmc.server.call('GetModeScriptSettings');
        let out: any = [];
        for (const data in settings) {
            out.push({
                setting: data,
                value: settings[data],
                type: typeof settings[data]
            });
        }
        window.setItems(out);
        window.setColumns([
            { key: 'setting', title: 'Setting', width: 75 },
            { key: 'value', title: 'Value', width: 50, type: 'entry' },
            { key: 'type', title: 'Type', width: 25 }
        ]);
        window.addApplyButtons();
        await window.display();
    }

    async cmdAddLocal(login: string, args: string[]) {
        if (args.length < 1) {
            const window = new LocalMapsWindow(login);
            window.size = { width: 175, height: 95 };
            let out: any = [];
            for (let file of fs.readdirSync(tmc.mapsPath, { withFileTypes: true, recursive: true, encoding: 'utf8' })) {
                if (file.name.toLowerCase().endsWith('.gbx')) {
                    let name = htmlEntities(file.name.replaceAll(/[.](Map|Challenge)[.]Gbx/gi, ''));
                    let filename = fsPath.resolve(tmc.mapsPath, file.parentPath, file.name);
                    let path = file.parentPath.replace(tmc.mapsPath, '');
                    out.push({
                        File: filename,
                        FileName: name,
                        Path: path,
                        MapName: '',
                        MapAuthor: ''
                    });
                }
            }
            window.title = `Add Local Maps [${out.length}]`;
            window.setItems(out);
            window.setColumns([
                { key: 'Path', title: 'Path', width: 40 },
                { key: 'FileName', title: 'Map File', width: 30, action: 'Add' },
                { key: 'MapName', title: 'Name', width: 50, action: 'Add' },
                { key: 'MapAuthor', title: 'Author', width: 35 }
            ]);
            window.setActions(['Add']);
            await window.display();
        } else {
            try {
                await tmc.server.call('AddMapList', args);
                await tmc.maps.syncMaplist();
                tmc.chat(`Added ${args.length} maps to the playlist`, login);
            } catch (e: any) {
                tmc.chat('Error: ' + e.message, login);
            }
        }
    }

    async cmdToggleMute(login: any, args: string[]) {
        if (args.length < 1) {
            tmc.chat('Usage: ¤cmd¤//togglemute ¤white¤<login>', login);
            return;
        }
        try {
            let ignores = await tmc.server.call('GetIgnoreList', 1000, 0);
            for (const ignore of ignores) {
                if (ignore.Login == args[0]) {
                    tmc.server.send('UnIgnore', args[0]);
                    tmc.chat(`¤info¤UnIgnoring ¤white¤${args[0]}`, login);
                    return;
                }
            }
            tmc.server.send('Ignore', args[0]);
            tmc.chat(`¤info¤Ignoring ¤white¤${args[0]}`, login);
        } catch (e: any) {
            tmc.chat(e, login);
        }
    }

    async cmdSetModeSetting(login: any, args: string[]) {
        if (args.length < 2) {
            tmc.chat('Usage: ¤cmd¤//setscript ¤white¤<setting> <value>', login);
            return;
        }
        const setting = args[0];
        const value: string = args[1];

        try {
            await tmc.server.call('SetModeScriptSettings', { [setting]: castType(value) });
        } catch (e: any) {
            tmc.chat('Error: ' + e.message, login);
            return;
        }
        tmc.chat(`Set ${setting} to ${value}`, login);
    }

    async cmdGuestlist(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat('Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>, clear, show, list', login);
            return;
        }
        switch (args[0]) {
            case 'clear': {
                try {
                    await tmc.server.call('CleanGuestList');
                    tmc.chat('¤info¤Guestlist cleared', login);
                } catch (e: any) {
                    tmc.chat('¤error¤' + e.message, login);
                }
                return;
            }
            case 'add': {
                try {
                    if (!args[1]) return tmc.chat('¤error¤Missing madatory argument: <login>', login);
                    await tmc.server.call('LoadGuestList', 'guestlist.txt');
                    const res = await tmc.server.call('AddGuest', args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to add ¤white¤${args[1]}¤error¤ as guest.`, login);
                    tmc.server.send('SaveGuestList', 'guestlist.txt');
                    return tmc.chat(`¤info¤Guest added: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case 'remove': {
                try {
                    if (!args[1]) return tmc.chat('¤error¤Missing madatory argument: <login>', login);
                    await tmc.server.call('LoadGuestList', 'guestlist.txt');
                    const res = await tmc.server.call('RemoveGuest', args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to remove ¤white¤${args[1]}¤error¤ as guest.`, login);
                    tmc.server.send('SaveGuestList', 'guestlist.txt');
                    return tmc.chat(`¤info¤Guest removed: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case 'show':
            case 'list': {
                const window = new PlayerListsWindow(login);
                window.title = 'Guestlist';
                window.size = { width: 175, height: 95 };
                window.setItems(await tmc.server.call('GetGuestList', -1, 0));
                window.setColumns([{ key: 'Login', title: 'Login', width: 100 }]);
                window.setActions(['RemoveGuest']);
                await window.display();
                return;
            }
            default: {
                tmc.chat('Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>, show, list', login);
                return;
            }
        }
    }
    async cmdBanlist(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat('Usage: ¤cmd¤//banlist ¤white¤add <login>,remove <login>, clear, show, list', login);
            return;
        }
        switch (args[0]) {
            case 'clear': {
                try {
                    await tmc.server.call('CleanBanList');
                    tmc.chat('¤info¤Banlist cleared', login);
                } catch (e: any) {
                    tmc.chat('¤error¤' + e.message, login);
                }
                return;
            }
            case 'add': {
                try {
                    if (!args[1]) return tmc.chat('¤error¤Missing madatory argument: <login>', login);
                    const res = await tmc.server.call('Ban', args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to ban ¤white¤${args[1]}¤error¤`, login);
                    return tmc.chat(`¤info¤Added to banlist: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case 'remove': {
                try {
                    if (!args[1]) return tmc.chat('¤error¤Missing madatory argument: <login>', login);
                    const res = await tmc.server.call('Unban', args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to unban ¤white¤${args[1]}¤error¤`, login);
                    return tmc.chat(`¤info¤Removed from banlist: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case 'show':
            case 'list': {
                const window = new PlayerListsWindow(login);
                window.title = 'BanList';
                window.size = { width: 175, height: 95 };
                window.setItems(await tmc.server.call('GetBanList', -1, 0));
                window.setColumns([{ key: 'Login', title: 'Login', width: 100 }]);
                window.setActions(['UnBan']);
                await window.display();
                return;
            }
            default: {
                tmc.chat('Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>,clear, show, list', login);
                return;
            }
        }
    }
    async cmdIgnoreList(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat('Usage: ¤cmd¤//ignorelist ¤white¤add <login>,remove <login>, clear, show, list', login);
            return;
        }
        switch (args[0]) {
            case 'clear': {
                try {
                    await tmc.server.call('CleanIgnoreList');
                    tmc.chat('¤info¤Ignorelist cleared', login);
                } catch (e: any) {
                    tmc.chat('¤error¤' + e.message, login);
                }
                return;
            }
            case 'add': {
                try {
                    if (!args[1]) return tmc.chat('¤error¤Missing madatory argument: <login>', login);
                    const res = await tmc.server.call('Ignore', args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to add ¤white¤${args[1]}¤error¤ as ignored player.`, login);
                    return tmc.chat(`¤info¤Player ignored: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case 'remove': {
                try {
                    if (!args[1]) return tmc.chat('¤error¤Missing madatory argument: <login>', login);
                    const res = await tmc.server.call('UnIgnore', args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to remove ¤white¤${args[1]}¤error¤ from ignored players`, login);
                    return tmc.chat(`¤info¤Player unignored: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case 'show':
            case 'list': {
                const window = new PlayerListsWindow(login);
                window.title = 'Guestlist';
                window.size = { width: 175, height: 95 };
                window.setItems(await tmc.server.call('GetIgnoreList', -1, 0));
                window.setColumns([{ key: 'Login', title: 'Login', width: 100 }]);
                window.setActions(['UnIgnore']);
                await window.display();
                return;
            }
            default: {
                tmc.chat('Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>, clear, show, list', login);
                return;
            }
        }
    }

    async cmdBlacklist(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat('Usage: ¤cmd¤//blacklist ¤white¤add <login>,remove <login>, clear, show, list', login);
            return;
        }
        switch (args[0]) {
            case 'clear': {
                try {
                    await tmc.server.call('ClearBlackList');
                    tmc.chat('¤info¤Blacklist cleared', login);
                } catch (e: any) {
                    tmc.chat('¤error¤' + e.message, login);
                }
                return;
            }
            case 'add': {
                try {
                    if (!args[1]) return tmc.chat('¤error¤Missing madatory argument: <login>', login);
                    await tmc.server.call('LoadBlackList', 'blacklist.txt');
                    const res = await tmc.server.call('BlackList', args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to add ¤white¤${args[1]}¤error¤ as guest.`, login);
                    tmc.server.send('SaveBlackList', 'blacklist.txt');
                    return tmc.chat(`¤info¤Added to blacklist: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case 'remove': {
                try {
                    if (!args[1]) return tmc.chat('¤error¤Missing madatory argument: <login>', login);
                    await tmc.server.call('LoadBlackList', 'blacklist.txt');
                    const res = await tmc.server.call('UnBlackList', args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to remove ¤white¤${args[1]}¤error¤ from blacklist`, login);
                    tmc.server.send('SaveBlackList', 'blacklist.txt');
                    return tmc.chat(`¤info¤Blacklist removed: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case 'show':
            case 'list': {
                const window = new PlayerListsWindow(login);
                window.title = 'Blacklist';
                window.size = { width: 175, height: 95 };
                window.setItems(await tmc.server.call('GetBlackList', -1, 0));
                window.setColumns([{ key: 'Login', title: 'Login', width: 100 }]);
                window.setActions(['RemoveBlacklist']);
                await window.display();
                return;
            }
            default: {
                tmc.chat('Usage: ¤cmd¤//blacklist ¤white¤add <login>,remove <login>, clear, show, list', login);
                return;
            }
        }
    }

    async cmdSetSetting(login: any, args: string[]) {
        if (this.currentSetting[login] == undefined) {
            tmc.chat('¤info¤No setting selected.', login);
            return;
        }
        if (args.length < 1) {
            tmc.chat('¤info¤Usage: ¤cmd¤//set ¤white¤<value>', login);
            return;
        }
        const setting = this.currentSetting[login];

        const value: any = castType(args.join(' ').trim(), setting.type);

        if (typeof value != setting.type || value == undefined || (setting.type == 'number' && isNaN(value))) {
            tmc.chat('¤error¤Invalid value', login);
            return;
        }

        try {
            tmc.settings.set(setting.key, value);
        } catch (e: any) {
            tmc.chat('Error: ' + e.message, login);
            return;
        }
        tmc.chat(`¤info¤Set $fff${setting.key} ¤info¤to $fff"${value}"`, login);
        this.currentSetting[login] = undefined;
        await this.cmdSettings(login, []);
    }

    async cmdSettings(login: string, args: string[]) {
        const window = new SettingsWindow(login);
        window.size = { width: 165, height: 95 };
        window.title = 'Settings';
        const settings = tmc.settings.getSettings();
        let out: any = [];
        for (const data in settings.defaults) {
            let value = settings.settings[data];
            let defaultValue = settings.defaults[data];
            let description = settings.descriptions[data];

            if (typeof settings.defaults[data] == 'boolean') {
                value = value ? '$0f0true' : '$f00false';
                defaultValue = defaultValue ? '$0f0true' : '$f00false';
            }
            if (typeof settings.defaults[data] == 'number') {
                value = '$df0' + value;
                defaultValue = '$df0' + defaultValue;
            }
            if (typeof settings.defaults[data] == 'string') {
                value = `${value}`;
                defaultValue = `${defaultValue}`;
            }

            const changed = value !== defaultValue;
            let prefix = '';
            let postfix = '';
            if (changed) {
                prefix = '$o';
                postfix = ' $z(changed)';
            }
            out.push({
                key: data,
                default: htmlEntities(defaultValue),
                value: htmlEntities(prefix + value),
                type: typeof settings.defaults[data],
                description: htmlEntities(description)
            });
        }
        window.setItems(out.sort((a: any, b: any) => a.key.localeCompare(b.key)));
        window.setColumns([
            { key: 'type', title: 'Type', width: 20 },
            //  { key: 'key', title: 'Setting', width: 60 },
            //   { key: 'default', title: 'Default Value', width: 20 },
            { key: 'value', title: 'Value', width: 125, action: 'Toggle' }
        ]);
        window.setActions(['Reset']);
        await window.display();
    }
}
