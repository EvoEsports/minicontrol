import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui2/forge';
import { removeColors } from '@core/utils';
import DefaultListHeader from './partials/ListHeader';
import DefaultListItem from './partials/ListItem';
import DefaultButton from './Button';
import { type dataTableDef } from '../listwindow';
import PaginateControls from './partials/PaginateControls';

export default function DataTable(props: any) {
    const { pos, data } = (props || {}) as { pos: string; data: dataTableDef };

    const dataProps = getProperties();
    const actions = dataProps.actions;

    const ListHeader = getComponent('ListHeader', DefaultListHeader);
    const ListItem = getComponent('ListItem', DefaultListItem);
    const Button = getComponent('Button', DefaultButton);

    const outHeaders: any = [];
    let rowCounter = 0,
        totalWidth = 0;

    for (const key in data.columns) {
        const column = data.columns[key];
        const action = dataProps.actions['title_' + key];
        outHeaders.push(<ListHeader pos={totalWidth} text={column.title} width={column.width} action={action} />);
        totalWidth += column.width;
        rowCounter += 1;
    }

    const sortedItems = data.items;

    if (data.sortColumn !== '') {
        sortedItems.sort((a: any, b: any) => {
            if (removeColors(a[data.sortColumn]).localeCompare(removeColors(b[data.sortColumn]), 'en', { numeric: true }) > 0) {
                return data.sortDirection;
            }
            return -data.sortDirection;
        });
    }
    const startIndex = data.pageNb * data.pageSize;
    const endIndex = startIndex + data.pageSize;

    const outItems: any = [];
    rowCounter = 0;
    for (const item of sortedItems.slice(startIndex, endIndex)) {
        let width = 0;
        let colIndex = 0;
        for (const key in data.columns) {
            const column = data.columns[key];
            const value = item[key];
            let action = '';
            if (column.actionKey && actions[`item_${rowCounter}_${column.actionKey}`]) {
                action = actions[`item_${rowCounter}_${column.actionKey}`];
            }
            const type = column.type ?? 'text';

            outItems.push(<ListItem index={rowCounter} pos={`${width} -${5 * rowCounter}`} type={type} text={value} size={`${column.width} 4`} action={action} />);
            width += column.width;
            colIndex += 1;
        }
        for (const action2 of data.listActions) {
            const outAction = actions[`item_${rowCounter}_${action2.key}`];
            outItems.push(<Button pos={`${width} -${5 * rowCounter}`} size="16 4" text={action2.title} action={outAction} halign="center" />);
            width += 17;
        }
        rowCounter += 1;
    }

    return (
        <>
            <frame pos={pos}>
                {outHeaders}
                <frame pos="0 -4">
                    {outItems}
                    <PaginateControls pos={`${dataProps.size.width * 0.5} -${(data.pageSize+0.5) * 5}`} data={data} />
                </frame>
            </frame>
        </>
    );
}
