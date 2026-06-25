[Back to Concept](../concept.md)

# GBX Client (GBXRemote / XML-RPC)

## Table of contents

- [Key responsibilities](#key-responsibilities)
- [API](#api)
- [Errors & limits](#errors--limits)
- [Best practices](#best-practices)
- [Example](#example)
- [Implementation notes](#implementation-notes)
- [Events](#events)

`GbxClient` is a low-level transport adapter that implements the GBXRemote (XML-RPC) stream protocol used by Trackmania dedicated servers. It is used by the `Server` class to communicate with the game server for XML-RPC calls and receive callbacks.

## Key responsibilities

- Connect to the server via TCP
- Perform protocol handshake (`GBXRemote 2`)
- Serialize/deserialize XML-RPC method calls, method responses, and callbacks
- Offer `call`, `send`, `callScript`, `sendScript`, `multicall`, `multisend`
- Buffering and chunk handling (partial messages)
- Convert legacy `TrackMania.` and `ManiaPlanet.` callback prefixes to `Trackmania.`
- Expose simple metrics for debugging counters

## API

```ts
class GbxClient {
    // connection
    async connect(host?: string, port?: number): Promise<boolean>;
    async disconnect(): Promise<true>;

    // XML-RPC method calls (wait for a response)
    async call(method: string, ...params: any): Promise<any>

    // XML-RPC requests (fire-and-forget)
    send(method: string, ...params: any): Promise<void>

    // ModeScript calls
    async callScript(method: string, ...args: any): Promise<any>
    async sendScript(method: string, ...args: any): Promise<any>

    // Pack multiple calls into a single request
    async multicall(methods: Array<any>): Promise<any[]>
    async multisend(methods: Array<any>): Promise<void>
}
```

### Errors & limits

- `call`/`send` will throw / log errors when the GBX transport is not connected
- Requests are validated against size limits; the limit depends on the running game (e.g., Trackmania has a 7 MB cap)
- When the transport is not connected, methods return `undefined` or reject

### Best practices

- Use `Server.call` / `Server.send` (wrappers) instead of directly calling `GbxClient` unless you need low-level control.
- For scripts or plugin code that interacts with ModeScript, use `callScript` (await) or `sendScript` (fire-and-forget).
- Use `multicall`/`multisend` where you need to batch many XMLRPC calls for performance.

### Example

```ts
// Inside a plugin or core code
await tmc.server.call('Authenticate', user, pass);
await tmc.server.call('ChatSendServerMessage', 'Hello world');

// Fire-and-forget
tmc.server.send('SomeMethod', arg1, arg2);
```

## Implementation notes

- `GbxClient` uses `xmlrpc/lib/serializer` and `xmlrpc/lib/deserializer` to process the XML-RPC payloads
- It keeps a `requestHandle` to match responses to their Promises
- The client supports optional counters (enabled with `DEBUG_GBX_COUNTERS=true`) to debug TX/RX rates and send counts
- Partial or large messages are handled with read headers and a buffer (`recvData`) — the module will only process complete messages

## Events

- The `Server` class listens to callbacks from `GbxClient`. Methods such as `Trackmania.Event.*` are forwarded to `Server` which in turn emits `TMC.*` events for plugin consumption.

---

If you need a separate document to describe `Server`'s `onCallback` and how it maps to `TMC` events, see [class/server.md](server.md).