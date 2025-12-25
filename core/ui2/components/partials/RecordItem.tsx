import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment, vec2 } from '@core/ui2/forge';
import { formatTime } from '@core/utils';

export default function RecordItem({ pos = '0 0', 'z-index': z = 1, size = '100 4', nickname = '', time = 0, rank = 0, highlight = false }) {
    const { colors } = getProperties();
    const formattedTime = formatTime(time);
    const bgcolor = highlight ? '000a' : `${colors.highlight}a`;
    let rankColor = 'fff';
    if (rank == 1) rankColor = 'db0e';
    if (rank == 2) rankColor = 'aabe';
    if (rank == 3) rankColor = '963e';

    return (
        <frame pos={`0 -${(rank - 1) * 4}`} z-index="2">
            <quad pos="2.5 0" z-index="0" size="4 3" bgcolor={rankColor} halign="center" />
            <label pos="2.5 -1.25" z-index="3" size="3.5 3" text={rank} scale="0.8" halign="center" valign="center" textsize="1" textfont="RobotoCondensedBold" />

            <label pos="6 -1.75" z-index="1" size="22 2.25" text={nickname} scale="0.85" halign="left" valign="center2" textsize="1" textfont="RobotoCondensedBold" />
            <label pos="33 -1.9" z-index="3" size="30 3" text={formattedTime} halign="center" valign="center2" textsize="0.8" textfont="RobotoCondensedBold" />

            <quad pos="5 0" z-index="-1" size="22.5  3.5" bgcolor={bgcolor} />
            <quad pos="33 0" z-index="-1" size="10 3.5" bgcolor={bgcolor} halign="center" />
        </frame>
    );
}
