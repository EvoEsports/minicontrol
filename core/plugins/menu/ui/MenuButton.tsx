import Button from '@core/ui2/components/Button';
import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function MenuButton() {
    const { actions, size, pos } = getProperties();

    return <Button pos="0 0" size={`${size.width} ${size.height}`} text="Menu" action={actions.openWidget} textsize="1" focusareacolor1="0009" />;
}
