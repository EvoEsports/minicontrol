import Plugin from '@core/plugins';

export default class FunCommands extends Plugin {

    async onLoad() {
        tmc.addCommand("/afk", this.command_afk.bind(this), "Go AFK");
        tmc.addCommand("/bootme", this.command_bootme.bind(this), "Boot yourself");
        tmc.addCommand("/ragequit", this.command_rq.bind(this), "Rage quit");
        tmc.addCommand("/bwoah", this.command_bwoah.bind(this), "Bwoah");
        tmc.addCommand("/gg", this.command_gg.bind(this), "Good game");
        tmc.addCommand("/ty", this.command_ty.bind(this), "Thank you");
        tmc.addCommand("/gn", this.command_gn.bind(this), "Good night");
        tmc.addCommand("/bb", this.command_bb.bind(this), "Bye bye");
        tmc.addCommand("/go", this.command_go.bind(this), "Go go go");
        tmc.addCommand("/n1", this.command_n1.bind(this), "Nice one");
        tmc.addCommand("/nt", this.command_nt.bind(this), "Nice time");
        tmc.addCommand("/posture", this.command_posture.bind(this), "Posture check");
        tmc.addCommand("/hydrate", this.command_hydrate.bind(this), "Hydrate check");
    }

    async onUnload() {
        tmc.removeCommand("/afk");
        tmc.removeCommand("/bootme");
        tmc.removeCommand("/ragequit");
        tmc.removeCommand("/bwoah");
        tmc.removeCommand("/gg");
        tmc.removeCommand("/ty");
        tmc.removeCommand("/gn");
        tmc.removeCommand("/bb");
        tmc.removeCommand("/go");
        tmc.removeCommand("/n1");
        tmc.removeCommand("/nt");
        tmc.removeCommand("/posture");
        tmc.removeCommand("/hydrate");
    }

    async command_afk(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname} ¤info¤is now away from keyboard.`);
        tmc.server.send(`ForceSpectator`, login, 1);
        tmc.server.send(`ForceSpectator`, login, 0);

    }

    async command_bootme(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname}$z$s¤white¤ chooses to boot back to real life!`);
        await tmc.server.call(`Kick`, login, `chooses to boot to real life`);;
    }
    async command_rq(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`$f00ARRRGGGGHHHHHH!!! ${player.nickname}$z$s$o$f00 RAGE QUITS!!`);
        await tmc.server.call(`Kick`, login, `rage quit.`);;
    }
    async command_bwoah(login: string, data: any) {
        tmc.chat(`$o$i$f00B$f30W$f50O$f70A$f80H$f90!$fa0!`);
    }
    async command_gg(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname}$z$s ¤white¤» $f90G$fa0o$fb0o$fb0d$fc0 $fd0G$fe0a$ff0m$ff0e $ff0e$fe0v$fd0e$fc0r$fb0y$f90o$f80n$f70e`);
    }
    async command_ty(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname}$z$s ¤white¤» $f30T$f20h$f20a$f20n$f11k$f11 $f11y$f02o$f02u$f02!`);
    }
    async command_gn(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname}$z$s ¤white¤» $037G$038o$039o$049d$04a $04bn$04ci$05cg$05dh$05et$06f`);
    }
    async command_bb(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname}$z$s ¤white¤» See you later, bye!`);
    }
    async command_go(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname}$z$s ¤white¤» $o$ff03¤white¤-$fe02¤white¤-$fc01$fb0 $fb0g$fa0o$f90g$f80o$f80g$e70o!`);
    }
    async command_n1(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname}$z$s ¤white¤» Nice one`);
    }
    async command_nt(login: string, data: any) {
        const player = await tmc.getPlayer(login);
        tmc.chat(`¤white¤${player.nickname}$z$s ¤white¤» $0dcN$0ddi$0ddc$0dde$0ce $0cet$0cfi$0bfm$0bfe`);
    }
    async command_posture(login: string, data: any) {
        tmc.chat(`$o$0f9P$0faO$0faS$0fbT$0ecU$0ecR$0edE$0ed $0deC$0deH$0dfE$0dfC$0cfK`);
    }
    async command_hydrate(login: string, data: any) {
        tmc.chat(`$o$18fH$09fY$09fD$0afR$0bfA$0bfT$0cfI$0dfO$1dfN  $1dfC$0cfH$0bfE$09fC$18fK`);
    }
}