import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui/forge';
import Button from './Button';

export default function Grid({ pos = '-180 90', 'z-index': z = 0, size = '360 180', divider = '1 1' }) {
    const { actions } = getProperties();

    const pdiv = vec2(divider || '1 1');
    if (pdiv.x == 0 || pdiv.y == 0) throw new Error('divided by zero');
    const psize = vec2(size);
    const x = psize.x / pdiv.x;
    const y = psize.y / pdiv.y;

    const out: any = [];
    for (let i = 0; i < pdiv.y; i++) {
        for (let j = 0; j < pdiv.x; j++) {
            out.push(<Button pos={`${x * j} -${y * i}`} text=" " size={`${x} ${y}`} action={actions[`grid_${j}_${i}`]} halign="left" focusareacolor1="0000" />);
        }
    }

    return (
        <frame pos={pos} z-index={z}>
            {out}
        </frame>
    );
}
