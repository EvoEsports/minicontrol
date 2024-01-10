import Plugin from "core/plugins";

interface BillState {
    login: string;
    amount: number;
    from: string;
    to: string;
    type: string;
}

export default class tmnf_coppers extends Plugin {
    depends: string[] = ["game:TmForever"];
    billStates: { [key: number]: BillState } = {};

    async onLoad() {
        tmc.addCommand("//coppers", this.coppers.bind(this), "Display coppers");
        tmc.addCommand("//pay", this.pay.bind(this), "Pay coppers");
        tmc.addCommand("//bill", this.bill.bind(this), "Bill coppers");
        tmc.server.on("Trackmania.BillUpdated", this.onBillUpdated.bind(this));
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
            const bill = this.billStates[BillId];
            if (StateName == "error") {

            } else if (StateName == "accepted") {
                tmc.chat(`¤info¤${bill.from} $fff${bill.type}s $fff${bill.amount} ¤info¤coppers to $fff${bill.to}`, bill.login);
            }
            else if (StateName == "refuced") {
                tmc.chat(`¤info¤${bill.from} ¤info¤refused to $fff${bill.type} $fff${bill.amount} ¤info¤coppers to $fff${bill.to}`, bill.login);
            } else {
                tmc.chat(`Unknown StateName: $fff${StateName}`, bill.login);
            }
            delete this.billStates[BillId];
        } else {
            tmc.cli(`¤info¤Bill $fff${BillId} ¤info¤updated to $fff${StateName} ¤info¤with transaction id $fff${TransactionId}`);
        }
    }

    async bill(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if(params.length < 3) {
            tmc.chat("¤info¤Usage: ¤cmd¤//bill $fff<login> <amount> <recipient>", login);
            return;
        }
        if (!params[0]) {
            tmc.chat("¤info¤No sender specified", login);
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
        if (!params[2]) {
            tmc.chat("¤info¤No recipient specified", login);
            return;
        }

        const amount = Number.parseInt(params[1]);
        const billId = await tmc.server.call("Bill", params[0], amount, params[2], `${params[0]} wants to send you ${amount} coppers`);
        this.billStates[billId] = {
            login: login,
            from: params[0],
            amount: amount,
            to: params[2],
            type: "bill"
        };
    }

    async pay(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
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
        const billId = await tmc.server.call("Pay", params[0], amount, "Coppers payment from " + tmc.server.name);
        this.billStates[billId] = {
            login: login,
            from: tmc.server.login,
            amount: amount,
            to: params[0],
            type: "pay"
        };
    }
}