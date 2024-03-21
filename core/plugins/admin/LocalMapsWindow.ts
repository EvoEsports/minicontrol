import ListWindow from 'core/ui/listwindow';

export default class LocalMapsWindow extends ListWindow {
    
    async onAction(login: string, action: string, item: any) {
        if (action == "Add") {
            await tmc.chatCmd.execute(login, "//addlocal " + item.Name);
        }        
    }
}