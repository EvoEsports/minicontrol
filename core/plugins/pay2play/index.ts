import Plugin from '@core/plugins';
import Widget from '@core/ui/widget';
import type Jukebox from '../jukebox';

export default class Pay2Play extends Plugin {
    static depends: string[] = [];
    widgets: Widget[] = [];

    skipAmount = parseInt(process.env.SKIP_AMOUNT ?? '150');
    resAmount = parseInt(process.env.RES_AMOUNT ?? '50');

    async onStart() {
        if (tmc.game.Name == 'Trackmania') return;
        this.widgets.push(this.createWidget(0, 'SKIP', this.skipAmount, this.skip.bind(this)));
        this.widgets.push(this.createWidget(1, 'RES', this.resAmount, this.res.bind(this)));

        for (let widget of this.widgets) {
            await widget.display();
        }
    }

    async onUnload() {
        for (let widget of this.widgets) {
            await widget.destroy();
        }
        this.widgets = [];
    }

    createWidget(index: number, text: string, amount: number, callback: CallableFunction) {
        const widget = new Widget();
        widget.size = { width: 10, height: 10 };
        widget.pos = { x: -160 + index * (widget.size.width + 1), y: 72.5, z: 5 };

        widget.template = 'core/plugins/pay2play/widget.twig';
        widget.setData({
            text: text,
            amount: amount
        });
        widget.setOpenAction(callback);
        return widget;
    }

    async skip(login: string, _data: any) {
        try {
            const bill = tmc.billMgr.createTransaction('SendBill', login, login, this.skipAmount, `Pay ${this.skipAmount} to skip map?`);
            bill.onPayed = async (bill) => {
                const player = await tmc.getPlayer(bill.loginFrom);
                tmc.chat(`¤white¤${player.nickname}$z$s¤info¤ paid to skip. Skipping!`);
                await tmc.server.call('NextMap');
            };
            await bill.send();
        } catch (e: any) {
            tmc.chat('¤error¤' + e.message, login);
        }
    }

    async res(login: string, _data: any) {
        try {
            const bill = tmc.billMgr.createTransaction('SendBill', login, login, this.resAmount, `Pay ${this.resAmount} to restart map?`);
            bill.onPayed = async (bill) => {
                const player = await tmc.getPlayer(bill.loginFrom);
                tmc.chat(`¤white¤${player.nickname}$z$s¤info¤ paid to restart. Map will be restarted!`);
                if (Object.keys(tmc.plugins).includes('jukebox')) {
                    await (tmc.plugins['jukebox'] as Jukebox).cmdRequeue(login, []);
                } else {
                    await tmc.server.call('RestartMap');
                }
            };
            await bill.send();
        } catch (e: any) {
            tmc.chat('¤error¤' + e.message, login);
        }
    }
}
