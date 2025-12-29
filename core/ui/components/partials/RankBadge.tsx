import { createElement, Fragment, getProperties, vec2 } from '@core/ui/forge';

interface RankBadgeProps {
    /** The rank number to display */
    rank: number;
    /** Position (x y) */
    pos?: string;
    /** Size of the badge */
    size?: string;
    /** Z-index layer */
    'z-index'?: number | string;
    /** Horizontal alignment */
    halign?: string;
    /** Vertical alignment */
    valign?: string;
    /** Whether to show highlight overlay (e.g., for "rank above me") */
    highlight?: boolean;
    /** Custom highlight color */
    highlightColor?: string;
    /** Text scale for non-medal ranks */
    textScale?: string;
}

/**
 * RankBadge - Colored rank indicator with medal colors for top 3
 *
 * Automatically applies:
 * - Gold (db0e) for rank 1
 * - Silver (aabe) for rank 2
 * - Bronze (963e) for rank 3
 * - White with black text for ranks 4+
 *
 * @example
 * <RankBadge rank={1} pos="2.5 0" />
 * <RankBadge rank={4} pos="2.5 0" highlight={isAboveMyRank} />
 */
export default function RankBadge({
    rank,
    pos = '2.5 0',
    size = '3 3',
    'z-index': z = 0,
    halign = 'center',
    valign = 'top',
    highlight = false,
    highlightColor = '090e',
    textScale = '0.8'
}: RankBadgeProps) {
    const pSize = vec2(size);
    const pPos = vec2(pos);

    // Determine colors based on rank
    let bgColor = 'fff';
    let textPrefix = '$000';
    let textSize = '1';
    let scale = textScale;

    if (rank === 1) {
        bgColor = 'db0e'; // Gold
        textPrefix = '$o$fff';
        textSize = '0.7';
        scale = '1';
    } else if (rank === 2) {
        bgColor = 'aabe'; // Silver
        textPrefix = '$o$fff';
        textSize = '0.7';
        scale = '1';
    } else if (rank === 3) {
        bgColor = '963e'; // Bronze
        textPrefix = '$o$fff';
        textSize = '0.7';
        scale = '1';
    }

    const labelPosY = pPos.y - pSize.y / 2 - 0.25;

    return (
        <>
            <quad
                pos={pos}
                z-index={z}
                size={size}
                bgcolor={bgColor}
                halign={halign}
                valign={valign}
            />
            <label
                pos={`${pPos.x} ${labelPosY}`}
                z-index={Number(z) + 3}
                size={size}
                text={`${textPrefix}${rank}`}
                scale={scale}
                halign={halign}
                valign="center"
                textsize={textSize}
                textfont="RobotoCondensedBold"
            />
            {highlight && (
                <quad
                    pos={pos}
                    z-index={Number(z) + 1}
                    size={size}
                    bgcolor={highlightColor}
                    halign={halign}
                    valign={valign}
                />
            )}
        </>
    );
}
