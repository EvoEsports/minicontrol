import { createElement, Fragment, setScript, getComponent, getProperties, maniascriptFragment } from '@core/ui/forge';
import { removeColors } from '@core/utils';
import DefaultListHeader from './partials/ListHeader';
import DefaultListItem from './partials/ListItem';
import DefaultListTitle from './partials/ListTitle';
import DefaultButton from './Button';
import { type dataTableDef } from '../listwindow';
import PaginateControls from './partials/PaginateControls';

export default function DataTable(props: any) {
    const { pos = '0 0', 'z-index': z = 1, usetitle = false, data } = (props || {}) as { pos: string; 'z-index': number; usetitle: boolean; data: dataTableDef };
    const { actions, size } = getProperties();

    const ListHeader = getComponent('ListHeader', DefaultListHeader);
    const ListItem = getComponent('ListItem', DefaultListItem);
    const ListTitle = getComponent('ListTitle', DefaultListTitle);
    const Button = getComponent('Button', DefaultButton);

    const outHeaders: any = [];
    let rowCounter = 0,
        itemCounter = 0,
        totalWidth = 0;

    for (const key in data.columns) {
        const column = data.columns[key];
        const action = actions['title_' + key];
        let halign = 'left';
        if (column.align) halign = column.align;
        outHeaders.push(<ListHeader pos={`${totalWidth} 0`} z-index={z} text={column.title} size={`${column.width} 5`} action={action} halign={halign} />);
        totalWidth += column.width;
        rowCounter += 1;
    }

    const sortedItems = data.items;

    if (data.sortColumn !== '') {
        sortedItems.sort((a: any, b: any) => {
            let value = 0;
            if (!isNaN(Number.parseFloat(a[data.sortColumn]))) {
                value = (a[data.sortColumn] - b[data.sortColumn]) * data.sortDirection;
            }
            if (typeof a[data.sortColumn] == "string" || isNaN(value)) {
                value = data.sortDirection * removeColors(a[data.sortColumn]).localeCompare(removeColors(b[data.sortColumn]), 'en', { numeric: true });
            }
            return value;
        });
    }
    const startIndex = data.pageNb * data.pageSize;
    const endIndex = startIndex + data.pageSize;

    const outItems: any = [];
    rowCounter = 0;
    for (const item of sortedItems.slice(startIndex, endIndex)) {
        let width = 0;
        let colIndex = 0;
        if (item.title) {
            outItems.push(<ListTitle pos={`0 -${5 * rowCounter}`} z-index={z} text={item.title} size={`${totalWidth} 4`} />);
            rowCounter += 1;
        }
        for (const key in data.columns) {
            const column = data.columns[key];
            const value = item[key];
            let action = '';
            if (column.actionKey && actions[`item_${item.index}_${column.actionKey}`]) {
                action = actions[`item_${item.index}_${column.actionKey}`];
            }
            const type = column.type ?? 'text';
            let halign = 'left';
            if (column.align) halign = column.align;
            outItems.push(
                <ListItem
                    index={itemCounter}
                    key={item.index}
                    pos={`${width} -${5 * rowCounter}`}
                    z-index={z + 0.01}
                    type={type}
                    text={value}
                    size={`${column.width} 4`}
                    halign={halign}
                    action={action}
                />
            );
            width += column.width;
            colIndex += 1;
        }
        for (const action2 of data.listActions) {
            const outAction = actions[`item_${item.index}_${action2.key}`];
            const awidth = action2.width || 10;
            if (action2.title) {
                outItems.push(<Button pos={`${width} -${5 * rowCounter}`} z-index={"" + z} size={`${awidth} 4`} text={action2.title} action={outAction} halign="center" />);
                width += awidth + 1;
            }
        }
        rowCounter += 1;
        itemCounter += 1;
    }

    return (
        <>
            <frame pos={pos} z-index={z + 1}>
                {outHeaders}
                <frame pos="0 -4" z-index={z + 2}>
                    {outItems}
                    <PaginateControls pos={`${(size.width + 4) * 0.5} -${size.height - 15}`} z-index={z} data={data} />
                </frame>
            </frame>
        </>
    );
}
