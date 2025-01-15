import ListWindow from '@core/ui/listwindow';
import type AdminPlugin from '.';

export default class SettingsWindow extends ListWindow {
    template: string = 'core/plugins/admin/settinglist.xml.twig';
    pageSize: number = 6;

    async onAction(login: string, action: string, item: any) {
        if (action == 'Toggle') {
            if (item.type == 'boolean') {
                const value = !tmc.settings.get(item.key);
                tmc.settings.set(item.key, value);
                await tmc.chatCmd.execute(login, '//settings');
                return;
            } else {
                (tmc.plugins['admin'] as AdminPlugin).currentSetting[login] = item;
                tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
                return;
            }
        }
        if (action == 'Select') {
            (tmc.plugins['admin'] as AdminPlugin).currentSetting[login] = item;
            tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
            return;
        }
        if (action == 'Reset') {
            tmc.settings.reset(item.key);
            if (this.recipient) delete (tmc.plugins['admin'] as AdminPlugin).currentSetting[this.recipient];
            tmc.chat(`¤info¤Setting $fff${item.key} ¤info¤reset to default value.`, login);
            await tmc.chatCmd.execute(login, '//settings');
            return;
        }
    }
    async hide(): Promise<void> {
        if (this.recipient) delete (tmc.plugins['admin'] as AdminPlugin).currentSetting[this.recipient];
        await super.hide();
    }
}
