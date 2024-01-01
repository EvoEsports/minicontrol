import fs from 'fs';
import tm from 'tm-essentials';

export default class TAlimitPlugin {
    startTime: number = Date.now();
    timeLimit: number = 0;
    active: boolean = false;
    extend: boolean = false;
    widgetId: string = "";
    widgetTemplate: string = fs.readFileSync(__dirname + "/templates/widget.twig", "utf8");

    constructor() {
        this.widgetId = tmc.ui.uuid();
        this.timeLimit = Number.parseInt(process.env.TALIMIT || "300");
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onBeginRound() {
        this.startTime = Date.now();
        this.active = true;
        if (this.extend) {
            this.extend = false;
            this.timeLimit = Number.parseInt(process.env.TALIMIT || "300");
        }
    }

    async onEndRound() {
        this.active = false;
        await this.hideWidget();
    }

    async onInit() {
        this.startTime = Date.now();
        if (tmc.game.Name == "TmForever") {
            tmc.debug("TALimit: TmForever detected, enabling plugin.");
                    
            tmc.server.on("Trackmania.BeginRound", this.onBeginRound.bind(this));
            tmc.server.on("Trackmania.EndRound", this.onEndRound.bind(this));

            if (await tmc.server.call("GetTimeAttackLimit") > 0) {
                tmc.server.send("SetTimeAttackLimit", 0);
                await tmc.chat("TALimit: TimeAttackLimit was set, disabling it.");
                tmc.server.send("NextMap");
            }

            tmc.addCommand("//extend", this.cmdExtendAdm.bind(this));
            tmc.addCommand("/extend", this.cmdExtend.bind(this));
            tmc.server.addOverride("SetTimeAttackLimit", this.overrideSetLimit.bind(this));
            setInterval(this.tick.bind(this), 1000);
            this.active = true;
        }
    }

    async tick() {
        const timeLeft = this.timeLimit - (Date.now() - this.startTime) / 1000;
        if (this.active && timeLeft <= 0) {
            this.active = false;
            tmc.server.send("NextMap");
        } else if (this.active) {
            this.showWidget();
        }
    }

    async cmdExtendAdm(login: string, params: string[]) {
        if (this.active) {
            this.timeLimit += Number.parseInt(params[0]) || Number.parseInt(process.env.TALIMIT || "300");
            tmc.cli(`TALimit: Time limit extended by ${params[0]} seconds. New limit: ${this.timeLimit} seconds.`);
        }
    }

    async cmdExtend(login: string, params: string[]) {
        if (this.active) {
            if (this.extend) return;
            this.extend = true;
            this.timeLimit += Number.parseInt(process.env.TALIMIT || "300");
            tmc.chat(`Time limit extended`);
            tmc.cli(`Time limit extended`);
        }
    }

    async overrideSetLimit(args: string) {
        const newlimit = Number.parseInt(args) / 1000;
        process.env["TALIMIT"] = newlimit.toString();
        this.timeLimit = newlimit;
    }

    async showWidget() {
        let color = "$fff";
        const timeLeft = this.timeLimit - (Date.now() - this.startTime) / 1000;
        if (timeLeft < 60) color = "$ff0";
        if (timeLeft < 30) color = "$f00";
        let time = tm.Time.fromSeconds(timeLeft).toTmString(true).replace(/\.\d\d/, "");

        const data = {
            time: `${color}$s${time}`,
            id: this.widgetId
        };
        const xml = tmc.ui.render(this.widgetTemplate, data);
        tmc.ui.display(xml);
    }

    async hideWidget() {
        await tmc.ui.hide(this.widgetId);
    }

}

tmc.addPlugin("tmnf_talimit", new TAlimitPlugin());

