import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function Button({ id = '', pos = '0 0', 'z-index': zindex = 0, size = '26 6', text = ' ', halign = 'center', action }) {
    const pSize = vec2(size);
    const pPos = vec2(pos);

    let posXoffset = pSize.x * 0.5;
    if (halign === 'left') posXoffset = 0;
    if (halign === 'right') posXoffset = pSize.x;

    const { colors } = getProperties();

    return (
        <frame id={id} pos={`${pPos.x + posXoffset} ${pPos.y - pSize.y * 0.5}`} class="uiContainer uiButton" z-index={zindex}>
            <label
                size={size}
                text={text || ' '}
                z-index="2"
                class="uiButton uiButtonElement"
                halign={halign}
                valign="center2"
                textfont="RobotoCondensedBold"
                translate="0"
                textsize="0.9"
                action={action}
                textcolor={colors.button_text}
                focusareacolor1={colors.button_bg}
                focusareacolor2={colors.button_bg_hover}
            />
        </frame>
    );
}
