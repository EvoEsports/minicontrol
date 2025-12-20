import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';

export default function Button(props: any) {
    const { id, pos, zindex, size, text, halign, action } = props || {};

    const [width, height] = size?.split(' ').map((v: string) => parseFloat(v)) || [26, 6];
    const [posX, posY] = pos?.split(' ').map((v: string) => parseFloat(v)) || [0, 0];
    let posXdiv = width ? width / 2 : 0;
    const posYdiv = height ? height / 2 : 0;
    let align = "center"
    if (halign) align = halign;

    if (halign === 'left') {
        posXdiv = 0;
    } else if (halign === 'right') {
        posXdiv = width;
    }

    const dataProps = getProperties();
    const colors = dataProps.colors;

    return (
        <frame id={`${id ?? ''}`} pos={`${posX + posXdiv} ${posY - posYdiv}`} class="uiContainer uiButton" z-index={zindex ?? 1}>
            <label
                size={`${width} ${height}`}
                text={text}
                z-index="2"
                class="uiButton uiButtonElement"
                halign={align}
                valign="center2"
                textfont="RobotoCondensedBold"
                translate="0"
                textsize="1.2"
                action={action}
                textcolor={colors.button_text}
                focusareacolor1={colors.button_bg}
                focusareacolor2={colors.button_bg_hover}
            />
        </frame>
    );
}
