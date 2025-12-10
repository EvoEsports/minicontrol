[Back to Concept](../concept.md)

# Bill manager

The `BillManager` provides a simple cross-game abstraction for the server's in‑game currency systems. It is designed to support both Maniaplanet and TMForever via unified callbacks & helpers.

What you can do with the Bill Manager:
- Create a billing transaction (SendBill, Donate, Pay)
- Attach callbacks for lifecycle events (issued, paid, refused, error)
- Send the bill / transaction to the game for processing

Location: `core/billmanager.ts`

## Overview

`BillManager` wraps a `BillState` object which stores transaction metadata and user-facing callbacks. It tracks created `BillState` objects until they complete and will invoke callbacks when `Trackmania.BillUpdated` events are received from the server.

Key features:
- Cross-game support for coin/planet/copper transactions
- Event-driven callback model for transaction lifecycle
- Built-in validation (admin checks, minimum amount)

## Important notes

- **Admin checks**: `Pay` and `SendBill` actions are only allowed when the `issuerLogin` is in `tmc.admins`.
- **Minimum amount**: Any transaction less than 10 units will throw an error when creating a transaction.
- **Donate** uses the `SendBill` method internally (alias)
- **Game-specific methods**: `getIngameCurrency()` calls `GetServerPlanets` on ManiaPlanet and `GetServerCoppers` on TmForever.

## API

### BillState (per-transaction object)
Properties:
- `issuerLogin` - login who issues the transaction (admin usually)
- `loginFrom` - login of player the bill is about
- `loginTo` - optional recipient (defaults to server login)
- `method` - `SendBill` | `Donate` | `Pay`
- `amount` - numeric amount
- `message` - message shown to player
- `transactionId` - filled later when transaction is created/updated
- `billId` - created by the server
- `stateName` - latest state name

Callbacks (assign to the `BillState` instance):
- `onIssued?: (bill: BillState) => Promise<void>` — invoked when the bill reaches `Issued` state
- `onPayed?: (bill: BillState) => Promise<void>` — invoked when the bill reaches `Payed` state (transaction complete)
- `onRefused?: (bill: BillState) => Promise<void>` — invoked when the bill was refused by player
- `onError?: (bill: BillState) => Promise<void>` — invoked on errors

Methods:
- `async send()` — Sends the transaction to the server (calls server's `SendBill`/`Pay`). Returns when `SendBill`/`Pay` call has returned a `billId`.

### BillManager
Properties:
- `billStates: BillState[]` — in-memory list of tracked transactions

Methods:
- `createTransaction(type, issuerLogin, loginFrom, amount, message): BillState` — Create a transaction and register it for state tracking. May throw on invalid inputs or permission checks.
- `getIngameCurrency()` — Query for server currency (Coppers/Planets) depending on the game

Events and internal handling:
- `onBillUpdated(data)` — internal listener (registered for `Trackmania.BillUpdated`) that maps the server state to the corresponding bill and calls the lifecycle callbacks above.

## Example usage

```ts
// Create bill, note: 'SendBill', 'Donate', 'Pay' are valid method values
const bill = tmc.billMgr.createTransaction(
    'SendBill',
    issuerLogin, // typically admin
    targetLogin, // who receives the bill (loginFrom)
    100,         // amount
    `You were billed 100 coppers by an admin. Do you want to pay this bill?`,
);

// Register lifecycle callbacks
bill.onIssued = async (b) => {
    const from = await tmc.getPlayer(b.loginFrom);
    const issuer = await tmc.getPlayer(b.issuerLogin);
    tmc.chat(`¤info¤${issuer.nickname} issued a bill of ¤white¤${b.amount} ¤info¤to ¤white¤${from.nickname}`);
};

bill.onPayed = async (b) => {
    tmc.chat(`¤info¤Bill ${b.billId} was paid successfully.`);
};

bill.onRefused = async (b) => {
    const from = await tmc.getPlayer(b.loginFrom);
    tmc.chat(`¤info¤${from.nickname} refused to pay the bill.`);
};

bill.onError = async (b) => {
    tmc.chat(`¤error¤Transaction failed: ${b.stateName}`, b.issuerLogin);
};

// Send the bill
await bill.send();
```

## Handling `Pay` transactions

`Pay` is used to trigger secure payments (items / subscription). Only admins can issue `Pay` transactions. Attempting to `createTransaction('Pay', ...)` with a non-admin `issuerLogin` will throw.

## Using `Donate`

`Donate` is an alias of `SendBill` and will result in the same server method being called; use it for semantic clarity.

## How `onBillUpdated` maps server events to callbacks

The BillManager listens to `Trackmania.BillUpdated` (only for TmForever/ManiaPlanet) and examines `StateName` to decide which callback to call:
- `Issued` → `onIssued`
- `Payed` → `onPayed` (and the bill is removed from tracking)
- `Refused` → `onRefused` (and the bill is removed from tracking)
- `error` → `onError` (and the bill is removed from tracking)

**Unknown states** are logged. The manager also supports internal handling for fallback states and a `TransactionId` update.

## Additional helper: getIngameCurrency()

Call `tmc.billMgr.getIngameCurrency()` to query the server's currency type and amount. Internally this maps the call to:
- `GetServerPlanets` on ManiaPlanet
- `GetServerCoppers` on TmForever

## Best practices
- Always perform admin checks before creating `SendBill` and `Pay` transactions at plugin level — the API enforces this but logging or extra checks help debug.
- Attach `onError` callbacks to handle edge cases and to report issues to the issuer.
- If you expect players to refuse or partially pay, implement `onRefused` and `onPayed` to keep your plugin state in sync.
- Use `tmc.cli()` and `tmc.debug()` to capture transaction lifecycle for troubleshooting.

## Troubleshooting
- If `createTransaction()` throws:
    - Confirm the issuer is an admin for `SendBill`/`Pay` cases
    - Confirm `amount >= 10` (minimum enforced)
- If callbacks are not fired:
    - Verify the server emits `Trackmania.BillUpdated` (older/newer games differ), and `tmc.game.Name` is one the manager supports.
    - Confirm your `BillState` has a valid `billId` after `send()` — inspect debug logs.

## Example (Donate)

```ts
const bill = tmc.billMgr.createTransaction('Donate', issuerLogin, targetLogin, 50, "Thanks for your help!");
bill.onIssued = async (b) => tmc.chat(`Thank you for your donation!`);
await bill.send();
```