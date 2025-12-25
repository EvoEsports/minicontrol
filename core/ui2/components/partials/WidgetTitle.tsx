import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function WidgetTitle({ pos = '0 0', 'z-index': z = 1, text = '', size = '38 5' }) {
    const psize = vec2(size);
    const ppos = vec2(pos);

    const { colors, actions } = getProperties();

    return (
        <frame pos={pos} z-index={z}>
            <label
                pos={`${psize.x / 2} -${psize.y * 0.5}`}
                z-index={z + 1}
                size={`${psize.x} ${psize.y}`}
                textsize="0.9"
                textfont="RobotoCondensed"
                text={text}
                focusareacolor1="0000"
                focusareacolor2={colors.highlight}
                textcolor={colors.title_fg}
                halign="center"
                valign="center2"
                action={actions.openWidget}
            />
            <quad pos="0 0" z-index={z} size={`${psize.x} ${psize.y}`} bgcolor={`${colors.title_bg}9`} halign="left" valign="top" />
            <quad pos="0 0" z-index={z} size={`0.5 ${psize.y}`} bgcolor={colors.highlight} halign="left" valign="top" />
        </frame>
    );
}
