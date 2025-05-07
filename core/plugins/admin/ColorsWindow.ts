import ListWindow from '@core/ui/listwindow';
import type AdminPlugin from '.';

export default class SettingsWindow extends ListWindow {
    template = 'core/plugins/admin/settinglist.xml.twig';
    pageSize = 6;

    async onAction(login: string, action: string, item: any) {
        if (action === 'Toggle') {
            (tmc.plugins['admin'] as AdminPlugin).currentSetting[login] = item;
            tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
            return;
        }
        if (action === 'Select') {
            (tmc.plugins['admin'] as AdminPlugin).currentSetting[login] = item;
            tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
            return;
        }
        if (action === 'Reset') {
            await tmc.settings.resetColor(item.key);
            if (this.recipient) delete (tmc.plugins['admin'] as AdminPlugin).currentSetting[this.recipient];
            tmc.chat(`¤info¤Setting $fff${item.key} ¤info¤reset to default value.`, login);
            await tmc.chatCmd.execute(login, '//colors');
            return;
        }
    }
    async hide(): Promise<void> {
        if (this.recipient) delete (tmc.plugins['admin'] as AdminPlugin).currentSetting[this.recipient];
        await super.hide();
    }
}
