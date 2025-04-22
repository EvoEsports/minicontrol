import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';
import { processColorString, htmlEntities } from '@core/utils';
import Menu from '@core/plugins/menu/menu';

export class Vote {
    type: string;
    question: string;
    value: number;
    timeout: number;
    votes: Map<string, boolean>;
    starter: string;
    voteRatio: number = 0.5;

    constructor(login: string, type: string, question: string, timeout: number, value: number) {
        this.starter = login;
        this.type = type;
        this.question = question;
        this.timeout = timeout;
        this.value = value;
        this.votes = new Map<string, boolean>();
    }
}

export interface VoteStruct {
    vote: Vote;
    yes: number;
    no: number;
    total: number;
    percent: number;
}

export default class VotesPlugin extends Plugin {
    static depends: string[] = [];
    timeout: number = 30;
    ratio: number = 0.55;
    currentVote: Vote | null = null;
    widget: Widget | null = null;
    readonly origTimeLimit = Number.parseInt(process.env.TALIMIT || '300');
    newLimit = this.origTimeLimit;
    extendCounter = 1;

    async onLoad() {
        tmc.server.addOverride('CancelVote', this.overrideCancel.bind(this));
        tmc.server.addListener('TMC.Vote.Cancel', this.onVoteCancel, this);
        tmc.server.addListener('TMC.Vote.Deny', this.onVoteDeny, this);
        tmc.server.addListener('TMC.Vote.Pass', this.onVotePass, this);
        tmc.server.addListener('Trackmania.BeginMap', this.onBeginRound, this);
        if (tmc.game.Name == 'TmForever') {
            tmc.server.addListener('Trackmania.EndRace', this.onEndMatch, this);
        } else {
            tmc.server.addListener('Trackmania.Podium_Start', this.onEndMatch, this);
        }
        tmc.addCommand('//vote', this.cmdVotes.bind(this), 'Start custom vote');
        tmc.addCommand('//pass', this.cmdPassVote.bind(this), 'Pass vote');
        tmc.addCommand('/skip', this.cmdSkip.bind(this), 'Start vote to Skip map');
        tmc.addCommand('/res', this.cmdRes.bind(this), 'Start vote to Restart map');
        tmc.addCommand('/extend', this.cmdExtend.bind(this), 'Start vote to Extend map');
        tmc.addCommand('//extend', this.cmdAdmExtend.bind(this), 'Extend timelimit');
        tmc.addCommand('/yes', this.cmdYes.bind(this), 'Vote yes');
        tmc.addCommand('/no', this.cmdNo.bind(this), 'Vote no');
        tmc.settings.register('votes.timeout', 30, (value) => (this.timeout = value), 'Votes: Vote Timeout in seconds');
        tmc.settings.register('votes.ratio', 0.55, (value) => (this.ratio = value), 'Votes: Vote ratio to pass');
        tmc.settings.register('votes.native.timeout', 0, (value) => tmc.server.send('SetCallVoteTimeOut', value), 'Votes: Native vote timeout $z(milliseconds, 0 to disable)');
        this.timeout = tmc.settings.get('votes.timeout');
        this.ratio = tmc.settings.get('votes.ratio');
        tmc.server.send('SetCallVoteTimeOut', tmc.settings.get('votes.native.timeout'));
    }

    async onUnload() {
        tmc.server.removeOverride('CancelVote');
        tmc.server.removeListener('TMC.Vote.Cancel', this.onVoteCancel);
        tmc.server.removeListener('TMC.Vote.Deny', this.onVoteDeny);
        tmc.server.removeListener('TMC.Vote.Pass', this.onVotePass);
        tmc.server.removeListener('Trackmania.EndRace', this.onEndMatch);
        tmc.server.removeListener('Trackmania.Podium_Start', this.onEndMatch);
        tmc.server.removeListener('Trackmania.BeginMap', this.onBeginRound);
        tmc.removeCommand('//vote');
        tmc.removeCommand('//pass');
        tmc.removeCommand('/skip');
        tmc.removeCommand('/extend');
        tmc.removeCommand('//extend');
        tmc.removeCommand('/yes');
        tmc.removeCommand('/no');
        this.widget?.destroy();
        this.widget = null;
        this.currentVote = null;
    }

    async onStart() {
        this.newLimit = tmc.storage['minicontrol.taTimeLimit'] || this.origTimeLimit || 300;

        const menu = Menu.getInstance();

        menu.addItem({
            category: 'Votes',
            title: 'Skip',
            action: '/skip'
        });

        menu.addItem({
            category: 'Votes',
            title: 'Extend',
            action: '/extend'
        });

        menu.addItem({
            category: 'Votes',
            title: 'Restart',
            action: '/res'
        });

        menu.addItem({
            category: 'Votes',
            title: 'Pass vote',
            action: '//pass',
            admin: true
        });

        menu.addItem({
            category: 'Votes',
            title: 'Cancel vote',
            action: '//cancel',
            admin: true
        });
    }

    async onEndMatch() {
        this.currentVote = null;
        this.hideWidget();
        tmc.server.emit('TMC.Vote.Cancel', { vote: this.currentVote });
    }

    async onBeginRound() {
        this.currentVote = null;
        this.newLimit = tmc.storage['minicontrol.taTimeLimit'] || this.origTimeLimit;
        this.hideWidget();
        if (this.extendCounter > 1) {
            tmc.server.send('SetTimeAttackLimit', this.newLimit * 1000);
        }
        this.extendCounter = 1;
    }

    async passVote(_login: string, _args: string[]) {
        if (!this.currentVote) {
            tmc.chat('There is no vote in progress.');
            return;
        }
        await this.endVote(true);
    }

    overrideCancel(login: string, _args: string[]) {
        if (this.currentVote) {
            tmc.chat('Vote cancelled by admin.');
            this.cancelVote(login);
            return true;
        }
        return false;
    }

    cancelVote(_login: string) {
        tmc.server.emit('TMC.Vote.Cancel', { vote: this.currentVote });
        this.currentVote = null;
        this.hideWidget();
    }

    async cmdVotes(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat('Please specify a vote type', login);
            return;
        }
        const type = args.shift() || '';
        const question = args.join(' ');
        await this.startVote(login, type, question);
    }

    async cmdSkip(login: string, _args: string[]) {
        await this.startVote(login, 'Skip', '¤info¤Skip map?');
    }

    async cmdRes(login: string, _args: string[]) {
        await this.startVote(login, 'Restart', '¤info¤Restart map?');
    }

    async cmdExtend(login: string, args: string[]) {
        let minutes = Number.parseInt(args[0]) || 5;
        if (minutes < 1) minutes = 1;
        if (minutes > 10) minutes = 10;

        let message = `¤info¤Extend map by ¤white¤${minutes} ¤info¤min?`;
        await this.startVote(login, 'Extend', message, minutes);
    }

    async startVote(login: string, type: string, question: string, value: number = -1) {
        if (!tmc.admins.includes(login)) {
            const allowedVotes = ['Skip', 'Extend','Restart'];
            if (!allowedVotes.includes(type)) {
                tmc.chat('You are not allowed to start this type of vote.', login);
                return;
            }
        }

        if (this.currentVote) {
            tmc.chat('There is already a vote in progress.', login);
            return;
        }
        this.currentVote = new Vote(login, type, question, Date.now() + this.timeout * 1000, value);
        this.currentVote.voteRatio = this.ratio;
        this.newLimit += 35;
        tmc.server.send('SetTimeAttackLimit', this.newLimit * 1000);
        await this.vote(login, true);
        this.widget = new Widget('core/plugins/votes/widget.xml.twig');
        this.widget.pos = { x: 0, y: 60, z: 10 };
        this.widget.actions['yes'] = tmc.ui.addAction(this.vote.bind(this), true);
        this.widget.actions['no'] = tmc.ui.addAction(this.vote.bind(this), false);
        await this.checkVote();
    }

    async cmdYes(login: string, _args: string[]) {
        await this.vote(login, true);
    }

    async cmdNo(login: string, _args: string[]) {
        await this.vote(login, false);
    }

    async cmdPassVote(login: string, _args: string[]) {
        await this.endVote(true);
    }

    async vote(login: string, vote: boolean) {
        if (!this.currentVote) {
            tmc.chat('There is no vote in progress.');
            return;
        }

        this.currentVote.votes.set(login, vote);
    }

    async checkVote() {
        if (!this.currentVote) {
            this.hideWidget();
            return;
        }
        if (this.currentVote.timeout < Date.now()) {
            await this.endVote(false);
            return;
        } else {
            setTimeout(this.checkVote.bind(this), 1000);
            await this.showWidget();
        }
    }

    async endVote(forcePass: boolean = false) {
        if (!this.currentVote) {
            this.hideWidget();
            return;
        }
        const votes = Array.from(this.currentVote.votes.values());
        const yes = votes.filter((vote) => vote).length;
        const no = votes.filter((vote) => !vote).length;
        const total = yes + no;
        const percent = Math.round((yes / total) * 100);

        if (forcePass) {
            tmc.chat('¤info¤Admin passed the vote');
            tmc.server.emit('TMC.Vote.Pass', { vote: this.currentVote, yes: yes, no: no, total: total, percent: percent });
        } else if (percent >= this.ratio * 100) {
            tmc.chat(`¤info¤Vote: ¤white¤${this.currentVote.question}`);
            tmc.chat(`¤info¤Vote passed: ¤white¤${yes} / ${no} (${percent}%)`);
            tmc.server.emit('TMC.Vote.Pass', { vote: this.currentVote, yes: yes, no: no, total: total, percent: percent });
        } else {
            tmc.chat(`¤info¤Vote: ¤white¤${this.currentVote.question}`);
            tmc.chat(`¤info¤Vote did not pass: ¤white¤${yes} / ${no} (${percent}%)`);
            tmc.server.emit('TMC.Vote.Deny', { vote: this.currentVote, yes: yes, no: no, total: total, percent: percent });
        }

        this.currentVote = null;
        this.hideWidget();
    }

    async showWidget() {
        if (!this.currentVote) {
            this.hideWidget();
            return;
        }
        if (!this.widget) return;
        const yes = Array.from(this.currentVote.votes.values()).filter((vote) => vote).length;
        const no = Array.from(this.currentVote.votes.values()).filter((vote) => !vote).length;
        const total = yes + no;
        const percent = yes / total;

        this.widget.setData({
            yes: yes,
            no: no,
            vote: this.currentVote,
            total: total,
            yes_ratio: percent,
            voteText: htmlEntities(processColorString(this.currentVote.question)),
            time_percent: (this.currentVote.timeout - Date.now()) / (this.timeout * 1000),
            timer: Math.round((this.currentVote.timeout - Date.now()) / 1000)
        });
        await this.widget.display();
    }

    hideWidget() {
        this.widget?.destroy();
        this.widget = null;
    }

    async cmdAdmExtend(_login: string, params: string[]) {
        this.extendCounter += 1;
        const seconds = params[0] ? parseInt(params[0]) : tmc.storage['minicontrol.taTimeLimit'] || this.origTimeLimit;
        this.newLimit += seconds;
        tmc.server.send('SetTimeAttackLimit', this.newLimit * 1000);
        tmc.chat(`¤info¤Time limit extended by ¤white¤${seconds} ¤info¤seconds.`);
    }

    onVotePass(data: VoteStruct) {
        if (data.vote.type === 'Skip') {
            tmc.server.send('NextMap');
            return;
        }
        if (data.vote.type === 'Restart') {
            tmc.server.send('RestartMap');
            return;
        }
        if (data.vote.type === 'Extend') {
            this.extendCounter += 1;
            this.newLimit += data.vote.value * 60;
            tmc.server.send('SetTimeAttackLimit', this.newLimit * 1000);
            return;
        }
    }

    onVoteDeny(_data: VoteStruct) {}

    onVoteCancel(_data: VoteStruct) {}
}
