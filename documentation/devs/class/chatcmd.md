# ChatCommand manager

```ts
class CommandManager {
    // add command
    addCommand(command: string, callback: CallableFunction, help: string = "", admin: boolean | undefined = undefined);
    // remove command
    removeCommand(command: string);
    // excute a command
    async execute(login, text);
}
```