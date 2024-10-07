import Plugin from '@core/plugins';
import Confirm from '@core/ui/confirm';
import Widget from '@core/ui/widget';
import type Jukebox from '../jukebox';

export default class Pay2Play extends Plugin {
    static depends: string[] = [];
    widgets: Widget[] = [];

    skipAmount = parseInt(process.env.SKIP_AMOUNT ?? '150');
    resAmount = parseInt(process.env.RES_AMOUNT ?? '50');

    async onStart() {
        if (tmc.game.Name == 'Trackmania') return;
        if (Object.keys(tmc.plugins).includes('votes')) {
            await tmc.unloadPlugin('votes');
        }
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
        widget.pos = { x: -130 + index * (widget.size.width + 1), y: 72.5, z: 5 };

        widget.template = 'core/plugins/pay2play/widget.twig';
        widget.setData({
            text: text,
            amount: amount
        });
        widget.setOpenAction(callback);
        return widget;
    }

    async skip(login: string, data: any) {
        try {
            const bill = tmc.billMgr.createTransaction('SendBill', login, login, this.skipAmount, `Pay ${this.skipAmount} to skip map?`);
            bill.onPayed = async (bill) => {
                tmc.chat(`¤white¤${bill.loginFrom}¤info¤ paid to skip. Skipping!`);
                await tmc.server.call('NextMap');
            };
            await bill.send();
        } catch (e: any) {
            tmc.chat('¤error¤' + e.message, login);
        }
    }

    async res(login: string, data: any) {
        try {
            const bill = tmc.billMgr.createTransaction('SendBill', login, login, this.skipAmount, `Pay ${this.skipAmount} to restart map?`);
            bill.onPayed = async (bill) => {
                tmc.chat(`¤white¤${bill.loginFrom}$z$s¤info¤ paid to restart. Map will be restarted!`);
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
