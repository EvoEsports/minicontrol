import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';
import Draggable from './effects/draggable';

export default function Window({ title = '', pos = '0 0', size = '120 90', 'z-index': zIndex = 0, children = {} }) {
    const psize = vec2(size);
    const ppos = vec2(pos);
    const { actions, colors, data } = getProperties();

    if (data.draggable) {
        setScript(() => Draggable('title'), []);
    }
    return (
        <frame id="root" pos={`-${psize.x * 0.5} ${psize.y * 0.5 + ppos.y}`} z-index={zIndex}>
            <quad class="title" pos="0 0" z-index="1" size={`${psize.x} 6`} bgcolor={`${colors.title_bg}e`} halign="left" valign="bottom" scriptevents="1" />
            <quad pos={`${psize.x} 0`} z-index="3" size={`${psize.x} 0.4`} bgcolor={colors.highlight} opacity="1" valign="top" halign="right" />
            <label pos="2 3" z-index="2" size={`{ psize.x - 10 } 4`} text={title} textsize="2.5" valign="center2" textcolor={colors.title_fg} textfont="RobotoCondensedBold" />
            <label
                pos={`${psize.x - 4.5} 3`}
                z-index="2"
                size="9 6"
                halign="center"
                valign="center2"
                action={actions.close}
                text="x"
                textfont="RobotoCondensedBold"
                focusareacolor1={colors.title_bg}
                focusareacolor2="d00"
            />
            <quad pos="0 0" z-index="3" size={`${psize.x} 0.3`} bgcolor={colors.black} opacity="1" valign="center" halign="left" />
            <frame pos="2 -4" z-index="2">
                {children}
            </frame>
            <quad pos="0 0" z-index="1" size={`${psize.x} ${psize.y}`} bgcolor={`${colors.window_bg}e`} />
            <quad pos="-0.5 6.5" z-index="0" size={`${psize.x + 1} ${psize.y + 7}`} bgcolor="000b" />
        </frame>
    );
}
