import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';
import Draggable from './effects/draggable';

export default function Window(props: any) {
    const { title, size } = props || {};
    const o = getProperties();
    if (o.data.draggable) {
        setScript(() => Draggable('title'), []);
    }
    return (
        <frame id="root" pos={`-${size.width * 0.5} ${size.height * 0.5 + o.pos.y}`} z-index={o.pos.z}>
            <quad class="title" pos="0 0" z-index="1" size={`${size.width} 6`} bgcolor={`${o.colors.title_bg}e`} halign="left" valign="bottom" scriptevents="1" />
            <quad pos={`${size.width} 0`} z-index="3" size={`${size.width} 0.4`} bgcolor={o.colors.highlight} opacity="1" valign="top" halign="right" />
            <label pos="2 3" z-index="2" size={`{ size.width - 10 } 4`} text={title} textsize="2.5" valign="center2" textcolor={o.colors.title_fg} textfont="RobotoCondensedBold" />
            <label
                pos={`${size.width - 4.5} 3`}
                z-index="2"
                size="9 6"
                halign="center"
                valign="center2"
                action={o.actions.close}
                text="x"
                textfont="RobotoCondensedBold"
                focusareacolor1={o.colors.title_bg}
                focusareacolor2="d00"
            />
            <quad pos="0 0" z-index="3" size={`${size.width} 0.3`} bgcolor={o.colors.black} opacity="1" valign="center" halign="left" />
            <frame pos="2 -4" z-index="2">
                {props.children}
            </frame>
            <quad pos="0 0" z-index="1" size={`${size.width} ${size.height}`} bgcolor={`${o.colors.window_bg}e`} />
            <quad pos="-0.5 6.5" z-index="0" size={`${size.width + 1} ${size.height + 7}`} bgcolor="000b" />
        </frame>
    );
}
