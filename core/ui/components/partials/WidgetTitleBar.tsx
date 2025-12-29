import { createElement, Fragment, getProperties, vec2 } from '@core/ui/forge';

interface WidgetTitleBarProps {
    /** Title text to display */
    title: string;
    /** Position (x y) */
    pos?: string;
    /** Size (width height) */
    size?: string;
    /** Z-index layer */
    'z-index'?: number | string;
    /** Show a toggle button on the side */
    showToggle?: boolean;
    /** Toggle button position: 'left' or 'right' */
    togglePosition?: 'left' | 'right';
    /** Toggle button initial text (e.g., '<' or '>') */
    toggleText?: string;
    /** ID for the toggle button (for scripting) */
    toggleId?: string;
    /** Text size */
    textsize?: string;
    /** Whether title text has color prefix already */
    hasColorPrefix?: boolean;
}

/**
 * WidgetTitleBar - Header bar for widgets with optional toggle button
 *
 * Used in sliding panels like Streamers and LinkedServers.
 *
 * @example
 * <WidgetTitleBar title="STREAMERS" size="35 4" />
 * <WidgetTitleBar
 *     title="LINKED SERVERS"
 *     size="35 5"
 *     showToggle
 *     togglePosition="right"
 *     toggleText="<"
 *     toggleId="toggleBtn"
 * />
 */
export default function WidgetTitleBar({
    title,
    pos = '0 0',
    size = '35 5',
    'z-index': z = 0,
    showToggle = false,
    togglePosition = 'right',
    toggleText = '<',
    toggleId = 'toggleBtn',
    textsize = '0.6',
    hasColorPrefix = false
}: WidgetTitleBarProps) {
    const { colors } = getProperties();
    const pSize = vec2(size);
    const pPos = vec2(pos);

    const displayTitle = hasColorPrefix ? title : `$${colors.title_fg} ${title}`;

    // Calculate positions based on toggle position
    const textPosX = togglePosition === 'left' ? 6 : 1;
    const togglePosX = togglePosition === 'left' ? 2.5 : pSize.x + 2.5;
    const bgPosX = togglePosition === 'left' ? 5 : 0;

    return (
        <frame pos={pos} z-index={z}>
            {/* Title text */}
            <label
                pos={`${textPosX} -${pSize.y / 2}`}
                z-index={Number(z) + 1}
                size={`${pSize.x} ${pSize.y}`}
                text={displayTitle}
                textsize={textsize}
                halign="left"
                valign="center2"
                textfont="RobotoCondensed"
            />

            {/* Background */}
            <quad
                pos={`${bgPosX} 0`}
                z-index={Number(z) - 1}
                size={`${pSize.x} ${pSize.y}`}
                bgcolor={`${colors.title_bg}e`}
            />

            {/* Toggle button (optional) */}
            {showToggle && (
                <label
                    id={toggleId}
                    pos={`${togglePosX} -${pSize.y / 2}`}
                    z-index={Number(z) + 1}
                    size={`${pSize.y} ${pSize.y}`}
                    text={toggleText}
                    halign="center"
                    valign="center2"
                    textsize="2"
                    textfont="RobotoCondensed"
                    scriptevents="1"
                    bgcolor={`${colors.title_bg}e`}
                    focusareacolor1={`${colors.title_bg}e`}
                    focusareacolor2={colors.highlight}
                />
            )}
        </frame>
    );
}
