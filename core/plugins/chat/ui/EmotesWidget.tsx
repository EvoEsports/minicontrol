import DefaultButton from '@core/ui2/components/Button';
import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';

export default function EmotesWidget({ text = '' }) {
    const Button = getComponent('Button', DefaultButton);
    const { size, pos } = getProperties();
    return <Button pos={`${pos.x} ${pos.x}`} z-index="2" text={text} />;
}
