import Plugin from "@core/plugins";
import Widget from "@core/ui2/widget";
import Label from "@core/ui2/components/partials/Label";
import type { ActionCallback } from "@core/uimanager";
import Button from "@core/ui2/components/Button";

declare module "@core/plugins" {
    interface PluginRegistry {
        "tmnf/pay2play": Pay2Play;
    }
}
export default class Pay2Play extends Plugin {
    widgets: Widget[] = [];

    skipAmount = 150;
    resAmount = 50;

    async onStart() {
        this.addSetting("pay2play.skipAmount", 150, this.updateSkipWidget.bind(this), "Pay2Play: Skip map amount");
        this.addSetting("pay2play.resAmount", 50, this.updateResWidget.bind(this), "Pay2Play: Restart map amount");
        this.skipAmount = tmc.settings.get("pay2play.skipAmount");
        this.resAmount = tmc.settings.get("pay2play.resAmount");

        this.widgets.push(this.createWidget(0, "SKIP", this.skipAmount, this.skip.bind(this)));
        this.widgets.push(this.createWidget(1, "RES", this.resAmount, this.res.bind(this)));

        for (const widget of this.widgets) {
            widget.display();
        }
    }

    async updateSkipWidget(value: any) {
        this.skipAmount = Number.parseInt(value);
        this.widgets[0].data.amount = this.skipAmount;
        await this.widgets[0].display();
    }

    async updateResWidget(value: any) {
        this.resAmount = Number.parseInt(value);
        this.widgets[1].data.amount = this.resAmount;
        await this.widgets[1].display();
    }

    async onUnload() {
        for (const widget of this.widgets) {
            await widget.destroy();
        }
        this.widgets = [];
    }

    createWidget(index: number, text: string, amount: number, callback: ActionCallback) {
        const action = tmc.ui.addAction(callback, []);
        const widget = new Widget(() => {
            return [Label({
                pos: "5 -1.5",
                "z-index": 2,
                size: "20 5",
                scale: "0.3",
                style: "TextRaceChrono",
                text: `$fa0${amount}`,
                halign: "center",
            }),
            Label({
                pos: "5 -5.5",
                "z-index": 2,
                size: "20 5",
                textsize: "1",
                text: text,
                halign: "center",
            }),
            Button({
                pos: "0 0",
                "z-index": 1,
                size: "10 10",
                action: action,
                focusareacolor1: "000a",
            })];

        }, "pay2play_" + text.toLowerCase());
        widget.size = { width: 10, height: 10 };
        widget.pos = { x: -160 + index * (widget.size.width + 1), y: 72.5, z: 5 };
        return widget;
    }

    async skip(login: string, _data: any) {
        if (this.skipAmount <= 0) {
            tmc.chat("¤error¤Skip amount is set to 0", login);
            return;
        }

        try {
            const bill = tmc.billMgr.createTransaction("SendBill", login, login, this.skipAmount, `Pay ${this.skipAmount} to skip map?`);
            bill.onPayed = async (bill) => {
                const player = await tmc.getPlayer(bill.loginFrom);
                tmc.chat(`¤white¤${player.nickname}$z$s¤info¤ paid to skip. Skipping!`);
                await tmc.server.call("NextMap");
            };
            await bill.send();
        } catch (e: any) {
            tmc.chat(`¤error¤${e.message}`, login);
        }
    }

    async res(login: string, _data: any) {
        if (this.resAmount <= 0) {
            tmc.chat("¤error¤Res amount is set to 0", login);
            return;
        }
        try {
            const bill = tmc.billMgr.createTransaction("SendBill", login, login, this.resAmount, `Pay ${this.resAmount} to restart map?`);
            bill.onPayed = async (bill) => {
                const player = await tmc.getPlayer(bill.loginFrom);
                tmc.chat(`¤white¤${player.nickname}$z$s¤info¤ paid to restart. Map will be restarted!`);
                const plugin = tmc.getPlugin("jukebox");
                if (plugin) {
                    await plugin.cmdRequeue(login, []);
                } else {
                    await tmc.server.call("RestartMap");
                }
            };
            await bill.send();
        } catch (e: any) {
            tmc.chat(`¤error¤${e.message}`, login);
        }
    }
}
