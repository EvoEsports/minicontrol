import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function WidgetButton({ size = '10 10', link = '' }) {
    const { colors } = getProperties();
    const psize = vec2(size);

    return (
        <>
            <label
                pos={`${psize.x * 0.5} -1.5`}
                z-index="2"
                size={`${psize.x} 4`}
                text="ADD"
                halign="center"
                valign="top"
                textcolor={colors.widget_text}
                textfont="RobotoCondensedBold"
                textsize="1"
            />
            <label
                pos={`${psize.x * 0.5} -5.5`}
                z-index="2"
                size={`${psize.x} 4`}
                text="FAV"
                halign="center"
                valign="top"
                textcolor={colors.widget_text}
                textfont="RobotoCondensedBold"
                textsize="1.2"
            />
            <label
                pos="0 0"
                z-index="1"
                size={`${psize.x} ${psize.y}`}
                text=" "
                focusareacolor1={`${colors.widget_bg}9`}
                focusareacolor2={colors.highlight}
                manialink={link}
                addplayer="1"
            />
        </>
    );
}
