import { memInfo } from '@core/utils';
import Plugin from '@core/plugins';
import tm from 'tm-essentials';
import Widget from '@core/ui/widget';

export default class DebugTool extends Plugin {
    widget: Widget | null = null;
    intervalId: any = null;

    async onLoad() {
        if (process.env.DEBUG == 'true') {
            this.widget = new Widget('core/plugins/debugtool/widget.xml.twig');
            this.widget.pos = { x: 159, y: -60, z: 0 };
            if (tmc.game.Name != 'TmForever') {
                tmc.addCommand('//addfake', this.cmdFakeUsers.bind(this), 'Connect Fake users');
                tmc.addCommand('//removefake', this.cmdRemoveFakeUsers.bind(this), 'Connect Fake users');
            }
            this.intervalId = setInterval(() => {
                this.displayMemInfo();
            }, 30000) as any;
        }
        tmc.addCommand('//mem', this.cmdMeminfo.bind(this));
        tmc.addCommand('//uptime', this.cmdUptime.bind(this));
    }

    async onStart() {
        await this.displayMemInfo();
    }

    async onUnload() {
        clearInterval(this.intervalId!);
        tmc.removeCommand('//mem');
        tmc.removeCommand('//uptime');
        tmc.removeCommand('//addfake');
        tmc.removeCommand('//removefake');
        this.widget?.destroy();
        this.widget = null;
    }

    async cmdRemoveFakeUsers(_login: string, _args: string[]) {
        tmc.server.send('DisconnectFakePlayer', '*');
    }

    async cmdFakeUsers(_login: string, args: string[]) {
        let count = Number.parseInt(args[0]) || 1;
        if (count > 100) count = 100;
        if (count < 1) count = 1;
        for (let i = 0; i < count; i++) {
            tmc.server.send('ConnectFakePlayer');
        }
    }

    async cmdMeminfo(login: string, _args: string[]) {
        const mem = memInfo();
        tmc.chat('¤info¤Memory usage: ' + mem, login);
    }

    async cmdUptime(login: string, _args: string[]) {
        let diff = Date.now() - Number.parseInt(tmc.startTime);
        tmc.chat(
            '¤info¤Uptime: ¤white¤' +
                tm.Time.fromMilliseconds(diff)
                    .toTmString()
                    .replace(/[.]\d{3}/, ''),
            login
        );
    }

    async displayMemInfo() {
        const mem = memInfo();
        let start = Date.now() - Number.parseInt(tmc.startTime);
        tmc.cli(
            '¤info¤Memory usage: ' +
                mem +
                ' ¤info¤uptime: ¤white¤' +
                tm.Time.fromMilliseconds(start)
                    .toTmString()
                    .replace(/[.]\d{3}/, '')
        );
        if (this.widget) {
            this.widget.setData({ mem: mem });
            await this.widget.display();
        }
    }
}
