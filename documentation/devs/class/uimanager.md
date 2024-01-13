# UImanager

Adapter class to transform manialink v3 to legacy formats and manage overall Manialink actions and drawing.

```ts
class UiManager {

    // generate new uuid for manialinks id's
    uuid();
    // Add manialink action, increase manialink counter by one
    addAction(callback, data:any): number;
    removeAction(actionId:string|number);

    // displays a manialink
    displayManialink(manialink:Manialink, recipients);
    // hide a manialink
    hideManialink(manialink: Manialink, recipients);
    // hide and free resources
    destroyManialink(manialink: Manialink)
}


```