import Button from '@core/ui2/components/Button';
import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function MenuComponent() {
    const { data, colors, actions, size, pos } = getProperties();

    const quickButtons: any = [];

    let index = 0;
    for (const category of data.categories) {
        if (data.activeCategory === category) {
            quickButtons.push(
                <frame id={`button_${index}`} pos={`0 -${index * 5}`}>
                    <label pos="0 0" z-index="2" size="20 4" textsize="1" halign="center" valign="center" text={category} textcolor="fff" textfont="GameFontSemiBold" />
                    <quad pos="0 0" z-index="1" size="20 4" halign="center" valign="center" bgcolor={colors.highlight} />
                </frame>
            );
        } else {
            quickButtons.push(
                <frame id={`button_${index}`} pos={`0 -${index * 5}`}>
                    <label pos="0 0" z-index={pos.z+1} size="20 4" textsize="1" halign="center" valign="center" text={category} textcolor="fff" textfont="GameFontSemiBold" />
                    <label
                        pos="0 0"
                        z-index={pos.z}
                        size="20 4"
                        text=" "
                        halign="center"
                        valign="center"
                        focusareacolor1={colors.title_bg}
                        focusareacolor2={colors.highligh}
                        action={actions['cat_' + category]}
                    />
                </frame>
            );
        }
        index += 1;
    }

    index = 0;
    const items: any = [];

    for (const item of data.items) {
        if (item.admin) {
            items.push(<quad pos={`0 -${index * 4}`} z-index={pos.z+1} size="0.5 3.5" halign="left" valign="center" bgcolor="d00" />);
        }
        items.push(
            <label
                pos={`0 -${index * 4}`}
                z-index={pos.z}
                size="35 3.5"
                text={` ${item.title}`}
                textsize="1"
                halign="left"
                valign="center2"
                focusareacolor1="0009"
                focusareacolor2={colors.highlight}
                action={actions['item_' + item.title]}
            />
        );
        index += 1;
    }

    return (
        <frame pos="0 0" z-index={pos.z} halign="left" valign="top">
            <frame id="quickButtons" pos="0 0">
                {quickButtons}
            </frame>
            <frame id="items" pos="11 0">
                <frame id="content" pos="0 0">
                    {items}
                </frame>
            </frame>
            <quad pos="-10 2" z-index={pos.z - 2} size={`${size.width} ${size.height}`} bgcolor={colors.window_bg} />
        </frame>
    );
}
