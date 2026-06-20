import { createElement, Fragment, setScript, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';

export default function WidgetTitle({ pos = '0 0', 'z-index': z = 1, text = '', size = '38 5' }) {
    const psize = vec2(size);
    const ppos = vec2(pos);

    const { colors, fonts, actions } = getProperties();

    return (
        <frame pos={pos} z-index={z}>
            <label
                pos={`${psize.x * 0.5} -${psize.y * 0.5}`}
                z-index={z + 2}
                size={`${psize.x} ${psize.y}`}
                textsize="1.1"
                textfont={fonts.widget}
                text={`$o${text}`}
                focusareacolor1="0000"
                focusareacolor2={colors.highlight}
                textcolor={colors.title_fg}
                halign="center"
                valign="center2"
                action={actions.openWidget}
            />
            <label
                pos={`${psize.x * 0.5 + 0.2} -${psize.y * 0.5 + 0.3}`}
                z-index={z + 1}
                size={`${psize.x} ${psize.y}`}
                textsize="1.1"
                textfont={fonts.widget}
                text={`$o${text}`}
                textcolor="000"
                halign="center"
                valign="center2"
            />

            <quad pos={`${psize.x * 0.5} -${psize.y - 1}`} z-index={z-1} size={`${psize.x-2} 1`} bgcolor={`${colors.highlight}e`} halign="center" valign="top" />

        </frame>
    );
}
