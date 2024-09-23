import Plugin from "@core/plugins";

interface BillState {
    login: string;
    amount: number;
    recipient: string;
    to: string;
    type: string;
}

export default class tmnf_coppers extends Plugin {
    static depends: string[] = ["game:TmForever"];
    billStates: { [key: number]: BillState } = {};

    async onLoad() {
        tmc.addCommand("//coppers", this.coppers.bind(this), "Display coppers");
        tmc.addCommand("//pay", this.pay.bind(this), "Pay coppers");
        tmc.addCommand("//bill", this.bill.bind(this), "Bill coppers");
        tmc.addCommand("/donate", this.donate.bind(this), "Donate coppers to the server")
        tmc.server.addListener("Trackmania.BillUpdated", this.onBillUpdated, this);
    }

    async onUnload() {
        tmc.removeCommand("//coppers");
        tmc.removeCommand("//pay");
        tmc.removeCommand("//bill");
        tmc.server.removeListener("Trackmania.BillUpdated", this.onBillUpdated.bind(this));
    }

    async coppers(login: string) {
        const coppers = await tmc.server.call("GetServerCoppers");
        tmc.chat(`$fffServer coppers: $f90${coppers}`, login);
    }

    async onBillUpdated(data: any) {
        const BillId = data[0];
        const State = data[1];
        const StateName = data[2]
        const TransactionId = data[3];

        if (this.billStates[BillId]) {
            let recipient, player;
            const bill = this.billStates[BillId];
            switch(bill.type) {
                case "bill":
                recipient = await tmc.getPlayer(bill.recipient);
                player = await tmc.getPlayer(bill.login);
                if (StateName == "error") {
                    // do nothing
                } else if (StateName == "Issued") {
                    tmc.chat(`¤info¤${player.nickname}¤info¤ issued a bill of ¤white¤${bill.amount} ¤info¤coppers to ¤white¤${recipient.nickname}¤info¤.`)
                } else if (StateName == "Payed") {
                    delete this.billStates[BillId];
                    tmc.chat(`¤info¤${recipient.nickname}¤info¤ paid bill of ¤white¤${bill.amount} ¤info¤coppers`);
                }
                else if (StateName == "Refused") {
                    delete this.billStates[BillId];
                    tmc.chat(`¤info¤${recipient.nickname} ¤info¤refused to pay the bill.`);
                }
                else if (StateName == "ValidatingPayement") {
                    // do nothing
                } else {
                    tmc.chat(`Unknown StateName: ¤white¤${StateName}`);
                }
                break;
                case "pay":
                recipient = await tmc.getPlayer(bill.to);
                player = await tmc.getPlayer(bill.login);
                if (StateName == "error") {
                    // do nothing
                } else if (StateName == "Issued") {
                    // do nothing
                } else if (StateName == "Payed") {
                    delete this.billStates[BillId];
                    tmc.chat(`¤info¤${recipient.nickname}¤info¤ was paid out ¤white¤${bill.amount} ¤info¤coppers by ${player.nickname}¤info¤.`);
                }
                else if (StateName == "Refused") {
                    delete this.billStates[BillId];
                }
                else if (StateName == "ValidatingPayement") {
                    // do nothing
                } else {
                    tmc.chat(`Unknown StateName: ¤white¤${StateName}`);
                }
                break;
                case "donate":
                player = await tmc.getPlayer(bill.login);
                if (StateName == "error") {
                    // do nothing
                } else if (StateName == "Issued") {
                    // do nothing
                } else if (StateName == "Payed") {
                    delete this.billStates[BillId];
                    tmc.chat(`¤info¤${player.nickname}¤info¤ donated ¤white¤${bill.amount} ¤info¤coppers - thanks!`);
                }
                else if (StateName == "Refused") {
                    delete this.billStates[BillId];
                }
                else if (StateName == "ValidatingPayement") {
                    // do nothing
                } else {
                    tmc.chat(`Unknown StateName: ¤white¤${StateName}`);
                }
                break;
                default:
                break;
            }
        } else {
            tmc.cli(`¤info¤Bill ¤white¤${BillId} ¤info¤updated to ¤white¤${StateName} ¤info¤with transaction id ¤white¤${TransactionId}`);
        }
    }

    async bill(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
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
        if (isNaN(Number.parseInt(params[1]))) {
            tmc.chat("¤info¤Invalid amount specified", login);
            return;
        }

        const amount = Number.parseInt(params[1]);
        const billId = await tmc.server.call("SendBill", params[0], amount, `You were billed ${amount} coppers by an admin. Do you want to pay this bill?`, "");
        this.billStates[billId] = {
            login: login,
            recipient: params[0],
            amount: amount,
            to: tmc.server.login,
            type: "bill"
        };
    }

    async donate(login: string, params: string[]) {
        if(params.length < 1 || params.length > 1) {
            tmc.chat("¤info¤Usage: ¤cmd¤/donate ¤white¤<amount>", login);
            return;
        }
        if(isNaN(Number.parseInt(params[0]))) {
            tmc.chat("¤info¤Invalid amount specified", login);
            return;
        }

        const amount = Number.parseInt(params[0]);
        const billId = await tmc.server.call("SendBill", login, amount, `Donate ${amount} coppers to the server?`, "");
        this.billStates[billId] = {
            login: login,
            recipient: params[0],
            amount: amount,
            to: tmc.server.login,
            type: "donate"
        };
    }

    async pay(login: string, params: string[]) {
        if(params.length < 2 || params.length > 3) {
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
        if (isNaN(Number.parseInt(params[1]))) {
            tmc.chat("¤info¤Invalid amount specified", login);
            return;
        }
        const amount = Number.parseInt(params[1]);
        const label = params[2] ?? `$fffYou received a payment of ${amount} from ${tmc.server.name}`;
        const billId = await tmc.server.call("Pay", params[0], amount, label);
        this.billStates[billId] = {
            login: login,
            recipient: tmc.server.login,
            amount: amount,
            to: params[0],
            type: "pay"
        };
    }
}
