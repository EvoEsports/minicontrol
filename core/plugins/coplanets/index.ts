import Plugin from "@core/plugins";
import Confirm from "@core/ui/confirm";

export default class CoPlanets extends Plugin {
    static depends: string[] = [];

    async onLoad() {
        if (tmc.game.Name === "TmForever") tmc.addCommand("//coppers", this.coppers.bind(this), "Display coppers");
        if (tmc.game.Name === "ManiaPlanet") tmc.addCommand("//planets", this.planets.bind(this), "Display planets");

        if (tmc.game.Name === "TmForever" || tmc.game.Name === "ManiaPlanet") {
            tmc.addCommand("//pay", this.pay.bind(this), "Pay from server");
            tmc.addCommand("//bill", this.bill.bind(this), "Bill");
            tmc.addCommand("/donate", this.donate.bind(this), "Donate to the server");
        }
    }

    async onUnload() {
        tmc.removeCommand("//coppers");
        tmc.removeCommand("//planets");
        tmc.removeCommand("//pay");
        tmc.removeCommand("//bill");
        tmc.removeCommand("/donate");
    }

    async coppers(login: string) {
        const coppers = await tmc.billMgr.getIngameCurrency();
        tmc.chat(`$fffServer coppers: $f90${coppers}`, login);
    }

    async planets(login: string) {
        const planets = await tmc.billMgr.getIngameCurrency();
        tmc.chat(`$fffServer planets: $f90${planets}`, login);
    }

    async bill(login: string, params: string[]) {
        if (params.length < 2) {
            tmc.chat("¤info¤Usage: ¤cmd¤//bill ¤white¤<login> <amount>", login);
            return;
        }
        if (!params[0]) {
            tmc.chat("¤info¤No bill recipient specified", login);
            return;
        }
        if (!params[1]) {
            tmc.chat("¤info¤No amount specified", login);
            return;
        }
        if (Number.isNaN(Number.parseInt(params[1]))) {
            tmc.chat("¤info¤Invalid amount specified", login);
            return;
        }

        const amount = Number.parseInt(params[1]);
        try {
            const bill = tmc.billMgr.createTransaction(
                "SendBill",
                login,
                params[0],
                amount,
                `You were billed ${amount} coppers by an admin. Do you want to pay this bill?`,
            );
            bill.onIssued = async (bill) => {
                const targetPlayer = await tmc.getPlayer(bill.loginFrom);
                const player = await tmc.getPlayer(bill.issuerLogin);
                tmc.chat(`¤info¤${player.nickname}¤info¤ issued a bill of ¤white¤${bill.amount} ¤info¤ to ¤white¤${targetPlayer.nickname}¤info¤.`);
            };
            bill.onPayed = async (_bill) => {
                tmc.chat("¤info¤Bill was paid successfully.");
            };
            bill.onRefused = async (bill) => {
                const targetPlayer = await tmc.getPlayer(bill.loginFrom);
                tmc.chat(`¤info¤${targetPlayer.nickname} ¤info¤refused to pay the bill.`);
            };
            bill.onError = async (bill) => {
                tmc.chat(`¤error¤${bill.stateName}`, bill.issuerLogin);
            };
            await bill.send();
        } catch (e: any) {
            tmc.chat(`¤error¤${e.message}`);
        }
    }

    async donate(login: string, params: string[]) {
        if (params.length < 1 || params.length > 1) {
            tmc.chat("¤info¤Usage: ¤cmd¤/donate ¤white¤<amount>", login);
            return;
        }
        if (Number.isNaN(Number.parseInt(params[0]))) {
            tmc.chat("¤info¤Invalid amount specified", login);
            return;
        }

        const amount = Number.parseInt(params[0]);
        try {
            const bill = tmc.billMgr.createTransaction("Donate", login, login, amount, `Donate ${amount} coppers to the server?`);
            bill.onPayed = async (bill) => {
                const player = await tmc.getPlayer(bill.loginFrom);
                tmc.chat(`¤info¤${player.nickname}¤info¤ donated ¤white¤${bill.amount} ¤info¤ - thanks!`);
            };
            bill.onError = async (bill) => {
                tmc.chat(`¤error¤${bill.stateName}`, bill.issuerLogin);
            };
            await bill.send();
        } catch (e: any) {
            tmc.chat(`¤error¤${e.message}`);
        }
    }

    async pay(login: string, params: string[]) {
        if (params.length < 2 || params.length > 3) {
            tmc.chat("¤info¤Usage: ¤cmd¤//pay ¤white¤<login> <amount> <optional:label>", login);
            return;
        }

        if (!params[0]) {
            tmc.chat("¤info¤No login specified", login);
            return;
        }
        if (!params[1]) {
            tmc.chat("¤info¤No amount specified", login);
            return;
        }
        if (Number.isNaN(Number.parseInt(params[1]))) {
            tmc.chat("¤info¤Invalid amount specified", login);
            return;
        }
        const amount = Number.parseInt(params[1]);
        const label = params[2] ?? `$fffYou received a payment of ${amount} from ${tmc.server.name}`;
        const confirm = new Confirm(login, `Pay ${amount} to ${params[0]}?`, this.confirmPay, [login, params[0], amount, label]);
        await confirm.display();
    }

    async confirmPay(login: string, to: string, amount: number, label: string) {
        try {
            const bill = tmc.billMgr.createTransaction("Pay", login, to, amount, label);
            bill.onPayed = async (bill) => {
                const targetPlayer = await tmc.getPlayer(bill.loginFrom);
                tmc.chat(`¤info¤${targetPlayer.nickname}¤info¤ was paid out ¤white¤${bill.amount}¤info¤ from the server¤info¤.`);
            };
            bill.onError = async (bill) => {
                tmc.chat(`¤error¤${bill.stateName}`, bill.issuerLogin);
            };
            await bill.send();
        } catch (e: any) {
            tmc.chat(`¤error¤${e.message}`);
        }
    }
}
