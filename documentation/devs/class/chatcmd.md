[Back to Concept](../concept.md)

# Chat Command Manager (CommandManager)

`CommandManager` (available at `tmc.chatCmd`) is the central registry for in-game chat commands and their handlers. It is used by core, built-in, and third-party plugins to expose chat commands to players and admins.

## Table of contents

- [Overview](#overview)
- [API](#api)
- [Registering commands](#registering-commands)
- [Built-in commands](#built-in-commands)
- [Execution & parsing](#execution--parsing)
- [Admin commands & permissions](#admin-commands--permissions)
- [Using `tmc.chatCmd.execute` programmatically](#using-tmcchatcmdexecute-programmatically)
- [Examples](#examples)
- [Best practices](#best-practices)

---

## Overview

The `CommandManager` maps command triggers (single-slash `/` or double-slash `//`) to asynchronous callback functions. Commands are matched case-insensitively at the beginning of the chat message. When a command is found, the arguments are parsed (supports quoted strings) and the command's callback is invoked:

```
callback(login: string, args: string[]): Promise<void>
```

Use `tmc.addCommand()` (shortcut) or `tmc.chatCmd.addCommand()` to register commands. Plugin authors should use the helper `this.addCommand()` from the plugin base class to ensure the command is automatically cleaned up on `onUnload()`.

## API

```ts
class CommandManager {
  addCommand(command: string, callback: CallableCommand, help?: string, admin?: boolean);
  removeCommand(command: string): void;
  async execute(login: string, text: string): Promise<void>;
}
```

The `callable` callback signature is:

```ts
type CallableCommand = (login: string, args: string[]) => Promise<void>;
```

## Registering commands

- `command`: the trigger text you want to match, e.g. `/help`, `//kick`, `/records`.
- `callback`: the async function invoked when the command is executed.
- `help`: optional help text shown in UIs (used by `/help`/`//help`).
- `admin` (optional): boolean to force marking the command as admin-only. By default the manager treats commands that start with `//` as admin commands.

Examples:

```ts
// Simple public command
tmc.addCommand('/hello', async (login, args) => {
  await tmc.chat(`Hello ${login}!`);
}, 'Say hello');

// Admin command (use double-slash or set admin flag)
tmc.addCommand('//kick', async (login, args) => {
  const target = args[0];
  await tmc.server.call('Kick', target);
}, 'Kick a player');
```

Plugin authors should prefer the plugin base helper to register commands that are removed automatically on plugin destroy:

```ts
this.addCommand('/mycmd', this.onMyCmd.bind(this), 'Do something');
```

## Built-in commands

The CommandManager registers a set of built-in commands during initialization. Notable commands include:

- `/help` — shows non-admin commands in a `ListWindow` (searchable with UI)
- `//help` — shows admin commands
- `/version` — displays server/controller version
- `//plugins` — shows plugin manager window
- `//plugin` — manage plugins (`list`, `load`, `unload`, `reload`) — admin only
- `//admin` — manage admins (list, add, remove) — admin only
- `//call` — call a server API method (useful for debugging) — admin only
- `//shutdown` — stop the controller — admin only

These are examples; your runtime might have additional built-in commands.

## Execution & parsing

Commands are matched only if the incoming chat text starts with `/` (the manager returns early if not). Matching logic:

- The manager iterates through registered commands and checks if the input text starts with the command trigger (case-insensitive).
- Commands support both single and double slash triggers; double slash forms are usually for admin commands.
- The manager supports quoted arguments. For example:

```
/say "this is a quoted string" one two
```

will parse into args: `['this is a quoted string', 'one', 'two']`

Parsing notes:
- Double-quoted strings support escaped quotes
- Numeric and boolean parsing is left to the command handler; the manager delivers raw string args

When a command is executed, the manager passes `login` and `args` to the callback function and awaits completion.

If no command matches, the user gets a `Command not found` message.

## Admin commands & permissions

Two places affect admin enforcement:

1. The input prefix — commands executed with `//` are treated as admin commands: if the player is not in `tmc.admins` (list of admin logins), the manager refuses execution and sends `Not allowed`.
2. Commands registered with `admin` flag or with `//` prefix are considered admin-only for UIs. For best practice, register admin-only commands with `//` triggers to ensure enforcement and UI segregation.

Note: There is a subtlety — the manager enforces admin permissions based on the incoming slash prefix (`//`) rather than the command's `admin` flag. In practice, register admin commands with `//` and avoid registering public commands with admin flag alone.

## Using `tmc.chatCmd.execute` programmatically

You can programmatically execute a command as a particular user or as server by calling `tmc.chatCmd.execute(login, text)`; for example:

```ts
await tmc.chatCmd.execute('playerLogin', '/ex-hello arg1 arg2');
```

This is commonly used to execute commands from UI actions, plugin logic, or tests.

## Examples

### Simple command

```ts
tmc.addCommand('/time', async (login) => {
  const map = tmc.maps.currentMap;
  await tmc.chat(`Current map: ${map.Name}`, login);
}, 'Show current map');
```

### Command with arguments

```ts
tmc.addCommand('/msg', async (login, args) => {
  const target = args[0];
  const text = args.slice(1).join(' ');
  await tmc.chat(text, target);
}, 'Send a private message');
```

### Command with quoted argument

```
// Player: /say "Hello everyone, this is a test"
// args = ['Hello everyone, this is a test']
```

### Registering commands from plugins

In a plugin extending the Project `Plugin` base class, prefer `this.addCommand()` so the plugin deregisters commands during `onUnload()`:

```ts
export default class MyPlugin extends Plugin {
  async onLoad() {
    this.addCommand('/records', this.cmdRecords.bind(this), 'List records');
  }
  async onUnload() {
    // Commands added via the plugin helper are removed automagically on destroy()
  }
}
```

### Admin commands

When registering a command that should be admin-only, use `//` trigger or mark `admin=true` (but prefer `//`):

```ts
this.addCommand('//restart', async (login, args) => {
  await tmc.server.call('RestartMap');
}, 'Restart the map (admin)');
```

## Best practices

- Use `this.addCommand()` in plugins (it auto-registers and cleans up on `destroy()`)
- Use simple, consistent command triggers (short names) and provide clear `help` text
- Make admin commands start with `//` and use `tmc.admins` for permission checks where needed
- Prefer quoting for multi-word arguments and use argument parsing within your callback for complex semantics
- Use `tmc.chatCmd.execute()` to run commands from UIs rather than duplicating logic

---

If you want, I can also add a `Chat command` reference page in README with more examples and a small unit test harness showing parameter parsing and admin enforcement. Which would you prefer next?
# ChatCommand manager

```ts
class CommandManager {

    /**
     * adds command to the command manager
     * @param command command to add
     * @param callback callack function
     * @param help help text
     * @param admin force admin
     */
    addCommand(command: string, callback: CallableFunction, help: string = "", admin: boolean | undefined = undefined);

    // remove command
    removeCommand(command: string);

    // excute a command
    async execute(login, text);
}
```
