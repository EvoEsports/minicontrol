import ListWindow from '@core/ui/listwindow';
import type AdminPlugin from '.';

export default class SettingsWindow extends ListWindow {
    async onAction(login: string, action: string, item: any) {
        if (action == 'Select') {
            if (tmc.game.Name == 'TmForever') {
                (tmc.plugins['admin'] as AdminPlugin).currentSetting[login] = item;
                tmc.chat(`¤info¤type ¤cmd¤//set <value> ¤info¤to change $fff${item.key}`, login);
                return;
            } else {
                tmc.settingsMgr.set(item.key, item.value);
            }
            await tmc.chatCmd.execute(login, '//settings');
        }
        if (action == 'Reset') {
            tmc.settingsMgr.reset(item.key);
            if (this.recipient) delete (tmc.plugins['admin'] as AdminPlugin).currentSetting[this.recipient];
            tmc.chat(`¤info¤Setting $fff${item.key} ¤info¤reset to default value.`, login);
            await tmc.chatCmd.execute(login, '//settings');
        }
    }
    async hide(): Promise<void> {
        if (this.recipient) delete (tmc.plugins['admin'] as AdminPlugin).currentSetting[this.recipient];
        await super.hide();
    }
}
