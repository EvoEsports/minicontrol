import fs from 'fs';
import { extend } from 'twig';

export class Vote {
    type: string;
    question: string;
    timeout: number;
    votes: Map<string, boolean>;
    starter: string;
    vote_ratio: number = 0.5;

    constructor(login: string, type: string, question: string, timeout: number) {
        this.starter = login;
        this.type = type;
        this.question = question;
        this.timeout = timeout;
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

export class VotesPlugin {
    timeout: number = 30;
    ratio: number = process.env.VOTE_RATIO ? parseFloat(process.env.VOTE_RATIO) : 0.5;
    currentVote: Vote | null = null;
    widgetId: string = tmc.ui.uuid();
    widget: string = fs.readFileSync(__dirname + "/templates/votes.twig", 'utf-8');
    actions: { [key: string]: number } = {};
    origTimeLimit = Number.parseInt(process.env.TALIMIT || "300");
    newLimit = this.origTimeLimit;
    extendCounter = 1;

    constructor() {
        this.timeout = process.env.VOTE_TIMEOUT ? parseInt(process.env.VOTE_TIMEOUT) : 30;
        this.actions['yes'] = tmc.ui.addAction(this.vote.bind(this), true);
        this.actions['no'] = tmc.ui.addAction(this.vote.bind(this), false);
        tmc.server.on("TMC.Init", this.onInit.bind(this));
        tmc.server.addOverride("CancelVote", this.overrideCancel.bind(this));
        tmc.server.on("TMC.Vote.Cancel", this.onVoteCancel.bind(this));
        tmc.server.on("TMC.Vote.Deny", this.onVoteDeny.bind(this));
        tmc.server.on("TMC.Vote.Pass", this.onVotePass.bind(this));
        tmc.server.on("Trackmania.EndMatch", this.cancelVote.bind(this));
    }

    async onInit() {
        tmc.server.on("Trackmania.BeginMap", this.onBeginRound.bind(this));
        tmc.addCommand("//vote", this.cmdVotes.bind(this), "Start custom vote");
        tmc.addCommand("//pass", this.cmdPassVote.bind(this), "Pass vote");
        tmc.addCommand("/skip", this.cmdSkip.bind(this), "Start vote to Skip map");
        tmc.addCommand("/extend", this.cmdExtend.bind(this), "Start vote to Extend map");
        tmc.addCommand("//extend", this.cmdAdmExtend.bind(this), "Extend timelimit");
        tmc.addCommand("/yes", this.cmdYes.bind(this), "Vote yes");
        tmc.addCommand("/no", this.cmdNo.bind(this), "Vote no");
    }

    async onBeginRound() {
        this.currentVote = null;
        this.hideWidget();
        if (this.extendCounter > 1) {
            tmc.server.send("SetTimeAttackLimit", this.origTimeLimit * 1000);
            this.extendCounter = 1;
        }
    }

    passVote(login: string, args: string[]) {
        if (!this.currentVote) {
            tmc.chat("There is no vote in progress.");
            return;
        }
        this.endVote(true);
    }

    overrideCancel(login: string, args: string[]) {
        if (this.currentVote) {
            tmc.chat("Vote cancelled by admin.");
            this.cancelVote(login);
            return true;
        }
        return false;
    }

    cancelVote(login: string) {
        tmc.server.emit("TMC.Vote.Cancel", login, { vote: this.currentVote });
        this.currentVote = null;
        this.hideWidget();
    }

    async cmdVotes(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Please specify a vote type", login);
            return;
        }
        const type = args.shift() || "";
        const question = args.join(" ");
        this.startVote(login, type, question);
    }

    async cmdSkip(login: string, args: string[]) {
        this.startVote(login, "Skip", "Skip map?");
    }

    async cmdExtend(login: string, args: string[]) {
        this.startVote(login, "Extend", "Extend map?");
    }

    async startVote(login: string, type: string, question: string) {
        if (!tmc.admins.includes(login)) {
            const allowedVotes = ["Skip", "Extend"];
            if (!allowedVotes.includes(type)) {
                tmc.chat("You are not allowed to start this type of vote.", login);
                return;
            }
        }

        if (this.currentVote) {
            tmc.chat("There is already a vote in progress.", login);
            return;
        }
        this.currentVote = new Vote(login, type, question, Date.now() + this.timeout * 1000);
        this.currentVote.vote_ratio = this.ratio;
        this.vote(login, true);
        this.checkVote();
    }

    async cmdYes(login: string, args: string[]) {
        this.vote(login, true);
    }

    async cmdNo(login: string, args: string[]) {
        this.vote(login, false);
    }

    async cmdPassVote(login: string, args: string[]) {
        this.endVote(true);
    }

    async vote(login: string, vote: boolean) {
        if (!this.currentVote) {
            tmc.chat("There is no vote in progress.");
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
            this.endVote(false);
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
        const yes = votes.filter((vote) => vote === true).length;
        const no = votes.filter((vote) => vote === false).length;
        const total = yes + no;
        const percent = Math.round((yes / total) * 100);

        if (forcePass) {
            tmc.chat('¤info¤Admin passed the vote');
            tmc.server.emit("TMC.Vote.Pass", { vote: this.currentVote, yes: yes, no: no, total: total, percent: percent });
        } else if (percent >= this.ratio * 100) {
            tmc.chat(`¤info¤Vote passed: ¤white¤${yes} / ${no} (${percent}%)`);
            tmc.server.emit("TMC.Vote.Pass", { vote: this.currentVote, yes: yes, no: no, total: total, percent: percent });
        } else {
            tmc.chat(`¤info¤ Vote did not pass: ¤white¤${yes} / ${no} (${percent}%)`);
            tmc.server.emit("TMC.Vote.Deny", { vote: this.currentVote, yes: yes, no: no, total: total, percent: percent });
        }

        this.currentVote = null;
        this.hideWidget();
    }


    async showWidget() {
        if (!this.currentVote) {
            tmc.ui.hide(this.widgetId);
            return;
        };
        const yes = Array.from(this.currentVote.votes.values()).filter((vote) => vote === true).length;
        const no = Array.from(this.currentVote.votes.values()).filter((vote) => vote === false).length;
        const total = yes + no;
        const percent = yes / total;
        const manialink = tmc.ui.render(this.widget, {
            id: this.widgetId,
            yes: yes,
            no: no,
            vote: this.currentVote,
            total: total,
            yes_ratio: percent,
            actions: this.actions,
            time_percent: (this.currentVote.timeout - Date.now()) / (this.timeout * 1000),
            time: (Date.now() - this.currentVote.timeout)
        });        
        tmc.ui.display(manialink);
    }

    hideWidget() {
        tmc.ui.hide(this.widgetId);
    }

    cmdAdmExtend(login: string, params: string[]) {
        this.extendCounter += 1;
        const seconds = params[0] ? parseInt(params[0]) : this.origTimeLimit;
        this.newLimit += seconds;
        tmc.server.send("SetTimeAttackLimit", this.newLimit * 1000);
        tmc.chat(`¤info¤Time limit extended by ¤white¤${seconds} ¤info¤seconds.`);
    }

    onVotePass(data: VoteStruct) {
        if (data.vote.type === "Skip") {
            tmc.server.call("NextMap");
            return;
        }
        if (data.vote.type === "Extend") {
            this.extendCounter += 1;
            this.newLimit += this.origTimeLimit;
            tmc.server.send("SetTimeAttackLimit", this.newLimit * 1000);
            return;
        }
    }

    onVoteDeny(data: VoteStruct) {

    }

    onVoteCancel(data: VoteStruct) {

    }
}

tmc.addPlugin("votes", new VotesPlugin());