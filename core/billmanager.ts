type Callable = (name: BillState) => Promise<void>;

export class BillState {
    issuerLogin = '';
    amount = 0;
    loginFrom = '';
    /** If specified, sends the bill to the specified login, defaults to server login */
    loginTo = '';
    method = '';
    message = '';
    transactionId = -1;
    billId = -1;
    stateName = '';

    onIssued?: Callable;
    onPayed?: Callable;
    onRefused?: Callable;
    onError?: Callable;

    async send() {
        switch (this.method) {
            case 'SendBill': {
                const billId = await tmc.server.call('SendBill', this.loginFrom, this.amount, this.message, this.loginTo);
                this.billId = billId;
                tmc.debug(`Bill ${billId} created.`);
                return;
            }
            case 'Pay': {
                const billId = await tmc.server.call('Pay', this.loginFrom, this.amount, this.message);
                this.billId = billId;
                tmc.debug(`Payment ${billId} created.`);
                return;
            }
        }
    }
}

export default class BillManager {
    billStates: BillState[] = [];

    /** @ignore */
    afterInit() {
        if (tmc.game.Name === 'TmForever' || tmc.game.Name === 'ManiaPlanet') {
            tmc.server.addListener('Trackmania.BillUpdated', this.onBillUpdated, this);
        }
    }

    /**
     * Creates transaction
     * @returns {BillState}
     * @throws {Error}
     */
    createTransaction(type: 'SendBill' | 'Donate' | 'Pay', issuerLogin: string, loginFrom: string, amount: number, message: string): BillState {
        const state: BillState = new BillState();
        state.issuerLogin = issuerLogin;
        state.loginFrom = loginFrom;
        state.loginTo = '';
        state.message = message;
        state.amount = amount;
        state.method = type;
        state.billId = -1;
        state.transactionId = -1;
        state.stateName = '';

        if (type === 'Pay') {
            if (!tmc.admins.includes(issuerLogin)) throw new Error('Not allowed.');
        }
        if (type === 'SendBill') {
            if (!tmc.admins.includes(issuerLogin)) throw new Error('Not allowed.');
        }
        if (type === 'Donate') {
            state.method = 'SendBill';
        }
        if (amount < 10) {
            throw new Error('Minimum amount = 10');
        }
        this.billStates.push(state);
        return state;
    }

    async getIngameCurrency() {
        switch (tmc.game.Name) {
            case 'ManiaPlanet': {
                return await tmc.server.call('GetServerPlanets');
            }
            case 'TmForever': {
                return await tmc.server.call('GetServerCoppers');
            }
        }
    }

    /** @ignore */
    removeBill(billId: number) {
        const index = this.billStates.findIndex((val) => val.billId === billId);
        if (index >= 0) {
            this.billStates.splice(index, 1);
        } else {
            tmc.cli("¤error¤Tried to remove a bill, but can't find it by index.");
        }
    }

    /** @ignore */
    async onBillUpdated(data: any) {
        const BillId = data[0];
        const State = data[1];
        const StateName = data[2];
        const TransactionId = data[3];

        const bill = this.billStates.find((val) => val.billId === BillId);
        if (bill) {
            bill.stateName = StateName;
            if (TransactionId) bill.transactionId = TransactionId;
            tmc.debug(`Processing Bill ${BillId}: Status ¤white¤${StateName}¤info¤.`);
            switch (StateName) {
                case 'CreatingTransaction': {
                    break;
                }
                case 'error': {
                    if (bill.onError) {
                        await bill.onError(bill);
                    }
                    this.removeBill(bill.billId);
                    break;
                }
                case 'Issued': {
                    if (bill.onIssued) {
                        await bill.onIssued(bill);
                    }
                    break;
                }
                case 'Payed': {
                    if (bill.onPayed) {
                        await bill.onPayed(bill);
                    }
                    this.removeBill(bill.billId);
                    break;
                }
                case 'Refused': {
                    if (bill.onRefused) {
                        await bill.onRefused(bill);
                    }
                    this.removeBill(bill.billId);
                    break;
                }
                case 'ValidatingPayement': {
                    break;
                }
                default: {
                    if (State === 6) {
                        if (bill.onError) {
                            await bill.onError(bill);
                        }
                        this.removeBill(bill.billId);
                        return;
                    }

                    tmc.cli(`Unknown Bill StateName: ¤white¤${StateName}`);
                    break;
                }
            }
        }
    }
}
