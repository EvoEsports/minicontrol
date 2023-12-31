abstract class Manialink {
    id: string = tmc.ui.uuid();
    size: any = { width: 160, height: 90 };
    pos: any = { x: 0, y: 20, z: 1 };
    baseTemplate: string = "";
    actions: { [key: string]: number } = {};
    content: string = "";
    login: string = "";
    title: string = "Window";
    
    constructor(login: string = "") {
        this.login = login;        
    }
      
    async display() {
        const xml = tmc.ui.render(this.baseTemplate, {
            id: this.id,
            size: this.size,
            content: this.content,
            pos: this.pos,
            actions: this.actions,
            title: this.title
        });
        tmc.ui.display(xml, this.login);
    }

    async hide(login: string, data: any) {
        for (let actionId of Object.values(this.actions)) {
            tmc.ui.removeAction(actionId);
        }
        tmc.ui.hide(this.id, this.login);
    }

}

export default Manialink;
