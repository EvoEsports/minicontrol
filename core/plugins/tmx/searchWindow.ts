import Confirm from '@core/ui/confirm';
import ListWindow from '@core/ui/listwindow';

export default class SearchWindow extends ListWindow {
    async onAction(login: string, action: string, item: any): Promise<void> {
        if (action === 'Install') {
            if (item.unlimiter) {
                const confirm = new Confirm(
                    login,
                    'If players do not have the unlimiter, they will not be able to play the map. Install anyway ?',
                    async (login: string, params: string) => {
                        await tmc.chatCmd.execute(login, params);
                    },
                    [login, `//add ${item.id}`]
                );

                await confirm.display();
            } else {
                await tmc.chatCmd.execute(login, `//add ${item.id}`);
            }
        }
        return super.onAction(login, action, item);
    }
}
