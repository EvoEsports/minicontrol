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
