import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';

export default function WidgetSettings() {
    const { data } = getProperties();

    return (
        <script>
            {maniascriptFragment(`
            main() {
                declare Boolean G_MC_MoveWidgets for ClientUI = False;
                G_MC_MoveWidgets = ${data.draggable ? 'True' : 'False'};
            }
    `)}
        </script>
    );
}
