[Back to Concept](../concept.md)

# Menu class

## Table of contents

- [API](#api)
- [Examples](#examples)
- [Details & behavior](#details--behavior)

The `Menu` class provides a basic in-memory menu registry and is used by built-in plugins (and other plugins) to register menu items visible to players.

Menu is implemented as a singleton and uses a simple item structure:

```ts
export interface Item {
    title: string;
    action: string; // could be a chat command string or custom action
    icon?: string;
    category: string;
    admin?: boolean; // only visible to admins if true
}
```

Core API

```ts
class Menu {
    // Returns the singleton instance
    public static getInstance(): Menu;

    // Add an item to the menu
    public addItem(item: Item): void;

    // Remove a menu item by title
    public removeItem(item: string): void;

    // Remove an entire category
    public removeCategory(category: string): void;

    // Return items in a category; respects admin flag
    public getItemsByCategory(category: string, login: string | undefined): Item[];

    // Return all items
    public getItems(): Item[];
}
```

Examples

Add a simple server action to the Menu and use it later in a widget:

```ts
// Registering a menu item
Menu.getInstance().addItem({
    category: "Server",
    title: "Show Help",
    action: "/help",
});

// Show a widget when the player clicks the menu button
this.menuButton = new Widget("menuButton.xml.twig", import.meta.dir);
this.menuButton.setOpenAction(this.toggleMenu.bind(this));
await this.menuButton.display();

// In your widget's click handler you can send the chat command or open a window
async toggleMenu(login: string) {
    await tmc.chatCmd.execute(login, "/help");
}
```

Details & behavior

- `getItemsByCategory` filters by the `admin` flag and only returns admin items for admin users (based on `tmc.admins`).
- Items are sorted alphabetically by title and admin items are shown after non-admin items by default.

Useful pattern: create a small helper plugin that adds frequently used commands and menu items at `onLoad` and removes them at `onUnload`.