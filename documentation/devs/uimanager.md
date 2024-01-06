# UImanager

Adapter class to transform manialink v3 to legacy formats and manage overall Manialink actions and drawing.

```ts
class UiManager {

    // generate new uuid for manialinks id's
    uuid();
    // Add manialink action, increase manialink counter by one
    addAction(callback, data:any): number;
    removeAction(actionId:string|number);
    // Get manialink template from file and render it
    renderfile(file:string, options:object);
    // render manialink template
    render(template:string, options:object);
    // displays a manialink
    display(manialink, recipients);
    // hide a manialink, free resources
    hide(id, recipients);

}


```