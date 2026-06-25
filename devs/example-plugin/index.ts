import Plugin from "@core/plugins";
import Widget from "@core/ui/widget";
import ListWindow from "@core/ui/listwindow";

declare module "@core/plugins" {
    interface PluginRegistry {
        "example-plugin": ExamplePlugin;
    }
}

export default class ExamplePlugin extends Plugin {
    widget: Widget | undefined;

    async onLoad() {
        // Register commands
        this.addCommand("/ex-hello", this.cmdHello.bind(this), "Say hello (public)");
        this.addCommand("/ex-msg", this.cmdMsg.bind(this), "Send a private message: /ex-msg <target> <message>");
        this.addCommand("/ex-list", this.cmdList.bind(this), "Show a sample list window");
        this.addCommand("/ex-copy", this.cmdCopyUid.bind(this), "Copy current map UID to clipboard");
        // Admin commands (use // prefix)
        if (tmc.game.Name === "TmForever" || tmc.game.Name === "Maniaplanet") {
            this.addCommand("//ex-bill", this.cmdBill.bind(this), "Send a bill to a player (admin)");
        }
        this.addCommand("//ex-admin", this.cmdAdminOnly.bind(this), "Admin command example");

        // Example setting (will be cleaned up automatically)
        this.addSetting("example.greeting", "Hello", this.onGreetingChanged, "Greeting shown in widget");
        this.addColor("example.greetingColor", "fff000", null, "Widget greeting color");

        // Track player connects so we can update the widget
        this.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
    }

    async onStart() {
        // Widget visible to all, controlled via import.meta.dirname to resolve template
        this.widget = new Widget("exampleWidget.xml.twig", import.meta.dirname);
        this.widget.title = "Example";
        this.widget.data = { count: tmc.players.getAllLogins().length, greeting: tmc.settings.get("example.greeting") || "Hello" };
        this.widget.size = { width: 32, height: 12 };
        this.widget.setOpenAction(this.onOpenWidget.bind(this));
        await this.widget.display();
    }

    async onUnload() {
        await this.widget?.destroy();
        this.widget = undefined;
    }

    async onPlayerConnect(player: any) {
        if (!this.widget) return;
        this.widget.data.count = tmc.players.getAllLogins().length;
        await this.widget.display();
    }

    async onGreetingChanged(value: any) {
        if (!this.widget) return;
        this.widget.data.greeting = value;
        await this.widget.display();
    }

    async onOpenWidget(login: string) {
        // Show a ListWindow when someone opens the widget
        const window = new ListWindow(login);
        window.title = "Widget open list";
        window.setColumns({
            col1: { title: "Title", width: 60 },
            col2: { title: "Value", width: 40 },
        });
        window.setItems([
            { col1: "Players online", col2: `${tmc.players.getAllLogins().length}` },
            { col1: "Current map", col2: `${tmc.maps.currentMap?.Name ?? "Unknown"}` },
        ]);
        window.setAction("view", "View", async (login, item: any,) => {
            tmc.chat(`You selected: ${item.col1} - ${item.col2}`, login);
        });
        await window.display();
    }

    async cmdHello(login: string, args: string[]) {
        const greeting: string = tmc.settings.get("example.greeting") || "Hello";
        tmc.chat(`${greeting} ${login}!`, login);
    }

    async cmdMsg(login: string, args: string[]) {
        if (args.length < 2) {
            tmc.chat("Usage: /ex-msg <target> \"message\"", login);
            return;
        }
        const target = args[0];
        const message = args.slice(1).join(" ");
        await tmc.chat(message, target);
        tmc.chat(`Message sent to ${target}`, login);
    }

    async cmdList(login: string, args: string[]) {
        const window = new ListWindow(login);
        window.title = "Example List";
        window.setColumns({
            id: { title: "ID", width: 20 },
            name: { title: "Name", width: 80 },
        });
        const items: any = [];
        let i = 1;
        for (const p of tmc.players.getAll()) {
            items.push({ id: `${i}`, name: p.nickname });
            i++;
        }
        window.setItems(items);
        await window.display();
    }

    async cmdCopyUid(login: string, args: string[]) {
        const map = tmc.maps.currentMap;
        if (!map) {
            tmc.chat("No current map", login);
            return;
        }
        tmc.ui.setClipboard(login, map.UId);
        tmc.chat(`Map UID copied: ${map.UId}`, login);
    }

    async cmdBill(login: string, args: string[]) {
        // Admin-only command //ex-bill <target> <amount> <message>
        if (args.length < 3) {
            tmc.chat("Usage: //ex-bill <target> <amount> \"message\"", login);
            return;
        }
        const target = args[0];
        const amount = Number.parseInt(args[1], 10);
        const message = args.slice(2).join(" ");
        if (Number.isNaN(amount)) {
            tmc.chat("Invalid amount", login);
            return;
        }

        let bill;
        try {
            bill = tmc.billMgr.createTransaction("SendBill", login, target, amount, message);
        } catch (err: any) {
            tmc.chat(`Failed: ${err.message}`, login);
            return;
        }

        bill.onIssued = async (bs) => {
            tmc.chat(`Bill issued to ${bs.loginFrom} amount ${bs.amount}`);
        };
        bill.onPayed = async (bs) => {
            tmc.chat(`Bill ${bs.billId} paid.`, login);
        };
        bill.onRefused = async (bs) => {
            tmc.chat(`User refused to pay bill ${bs.billId}.`, login);
        };
        bill.onError = async (bs) => {
            tmc.chat(`Error creating bill: ${bs.stateName}`, login);
        };

        await bill.send();
    }

    async cmdAdminOnly(login: string, args: string[]) {
        tmc.chat("Admin command executed.", login);
    }
}
