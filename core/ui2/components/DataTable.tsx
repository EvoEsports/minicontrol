import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';

export default function DataTable(props: any) {
    const { pos, itemsPerPage, currentPage } = props || {};
    const dataProps = getProperties();
    const data = dataProps.data;

    const outHeaders: any = [];
    let i = 0,
        totalWidth = 0;

    for (const key in data.columns) {
        const column = data.columns[key];
        outHeaders.push(<label pos={totalWidth} text={column.title} size={`${column.width} 6`} textsize="1.5" />);
        totalWidth += column.width + 1;
        i += 1;
    }

    i = 0;

    const items = data.items;
    const outItems: any = [];
    for (const item of items) {
        totalWidth = 0;
        for (const key in data.columns) {
            const column = data.columns[key];
            const value = item[key];
            outItems.push(<label pos={`${totalWidth} -${i * 4}`} text={value ?? ''} size={`${column.width} 6`} textsize="1.5" />);
            totalWidth += column.width + 1;
        }
        i += 1;
    }

    return (
        <>
            <frame pos={pos}>
                {outHeaders}
                <frame pos="0 -4">{outItems}</frame>
            </frame>
        </>
    );
}
