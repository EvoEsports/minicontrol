import DefaultButton from '@core/ui/components/Button';
import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';

export default function ButtonWidget() {
    const Button = getComponent('Button', DefaultButton);
    const { actions, size, pos } = getProperties();

    return <Button pos="0 0" size={`${size.width} ${size.height}`} z-index="2" text=" Chat" halign="left" action={actions.openWidget} focusareacolor1="0008" />;
}
