# Bill manager

easy to use interface for all games creating planets or copper transactions.
It can be broken into 3 sets:

1. Create bill
2. Assing callbacks for the bill for events
3. Send bill

## An example on how to use

```ts
// create bill, note: 'SendBill, Donate, Pay' are the options for first parameter
const bill = tmc.billMgr.createTransaction('SendBill', login, params[0], amount, `You were billed ${amount} coppers by an admin. Do you want to pay this bill?`);

// assign callbacks
bill.onIssued = async (bill) => {
    const targetPlayer = await tmc.getPlayer(bill.loginFrom);
    const player = await tmc.getPlayer(bill.issuerLogin);
    tmc.chat(`¤info¤${player.nickname}¤info¤ issued a bill of ¤white¤${bill.amount} ¤info¤ to ¤white¤${targetPlayer.nickname}¤info¤.`);
};

bill.onPayed = async (bill) => {
    tmc.chat(`¤info¤Bill was paid successfully.`);
};

bill.onRefused = async (bill) => {
    const targetPlayer = await tmc.getPlayer(bill.loginFrom);
    tmc.chat(`¤info¤${targetPlayer.nickname} ¤info¤refused to pay the bill.`);
};

bill.onError = async (bill) => {
    tmc.chat(`¤error¤${bill.stateName}`, bill.issuerLogin);
};

// send bill
await bill.send();
```
