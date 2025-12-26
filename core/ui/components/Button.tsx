import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';

export default function Button({ id = '', 'z-index': z = 1, pos = '0 0', size = '26 6', text = ' ', textsize= "0.9", halign = 'center', action, focusareacolor1 = "", focusareacolor2 = "" }) {
    const pSize = vec2(size);
    const pPos = vec2(pos);

    let posXoffset = pSize.x * 0.5;
    if (halign === 'left') posXoffset = 0;
    if (halign === 'right') posXoffset = pSize.x;

    const { colors } = getProperties();

    return (
        <frame id={id} pos={`${pPos.x + posXoffset} ${pPos.y - pSize.y * 0.5}`} z-index={z} class="uiContainer uiButton">
            <label
                size={size}
                text={text || ' '}
                z-index={z + 2}
                class="uiButton uiButtonElement"
                halign={halign}
                valign="center2"
                textfont="RobotoCondensedBold"
                translate="0"
                textsize={textsize}
                action={action}
                textcolor={colors.button_text}
                focusareacolor1={focusareacolor1 !== "" ? focusareacolor1 : colors.button_bg}
                focusareacolor2={focusareacolor2 !== "" ? focusareacolor2 : colors.button_bg_hover}
            />
        </frame>
    );
}
