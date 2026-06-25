import { createElement, getProperties, vec2 } from '@core/ui/forge';

interface WidgetBackgroundProps {
    /** Position (x y) */
    pos?: string;
    /** Size (width height) */
    size?: string;
    /** Z-index layer (defaults to -2 for background layer) */
    'z-index'?: number | string;
    /** Background color (hex without #) - uses widget_bg from colors if not specified */
    bgcolor?: string;
    /** Opacity value 0-1 */
    opacity?: string | number;
    /** Horizontal alignment */
    halign?: string;
    /** Vertical alignment */
    valign?: string;
    /** Optional ID */
    id?: string;
    /** Whether to append 'e' to bgcolor for slight transparency */
    semiTransparent?: boolean;
}

/**
 * WidgetBackground - A reusable background quad layer
 *
 * Automatically uses the widget_bg color from theme if no bgcolor specified.
 * Defaults to z-index -2 to sit behind content.
 *
 * @example
 * <WidgetBackground size="35 17" opacity="0.95" />
 * <WidgetBackground size="35 5" bgcolor="000" semiTransparent />
 */
export default function WidgetBackground({
    pos = '0 0',
    size = '35 17',
    'z-index': z = -2,
    bgcolor,
    opacity = '0.95',
    halign = 'left',
    valign = 'top',
    id = '',
    semiTransparent = false
}: WidgetBackgroundProps) {
    const { colors } = getProperties();

    let bgColor = bgcolor ?? colors.widget_bg;

    // Append 'e' for semi-transparent effect if requested
    if (semiTransparent && !bgColor.endsWith('e')) {
        bgColor = `${bgColor}e`;
    }

    return (
        <quad
            id={id}
            pos={pos}
            z-index={z}
            size={size}
            bgcolor={bgColor}
            opacity={opacity}
            halign={halign}
            valign={valign}
        />
    );
}
