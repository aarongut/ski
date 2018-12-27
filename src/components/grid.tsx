import { Picture } from "./picture";
import * as Model from "../model";

import * as React from "react";

export interface Props {
    images: Model.Images;
    onImageSelected: (key: string) => void;
    selectedImage: string | null;
    width: number;
}

export const ROW_HEIGHT = 200;
export const MOBILE_ROW_HEIGHT = 100;

export class Grid extends React.PureComponent<Props, {}> {
    static displayName = "Grid";

    render() {
        const keys = Object.keys(this.props.images);

        let row: string[] = [];
        const rows: string[][] = [];
        const rowWidths: number[] = [];
        let rowWidth = 0;

        keys.forEach(key => {
            const image = this.props.images[key];

            const newWidth = rowWidth + (image.width/image.height);
            const height = this.props.width / newWidth;

            if (height < this._rowHeight()) {
                rows.push(row);
                rowWidths.push(rowWidth);

                row = [];
                rowWidth = (image.width/image.height);
            } else {
                rowWidth = newWidth;
            }
            row.push(key);
        });
        rows.push(row);
        rowWidths.push(rowWidth);

        const images = rows.map((row, idx) => {
            const scale = this.props.width / rowWidths[idx];

            const pics = row.map(key => {
                const image = this.props.images[key];
                return <Picture
                    image={image}
                    onClick={() => this.props.onImageSelected(key)}
                    selected={this.props.selectedImage === key}
                    src={key}
                    key={key}
                    width={image.width/image.height * scale}
                />
            });
            return <div className="Grid-row" style={{height: scale + "px"}} key={row.join(",")}>{pics}</div>;
        });

        return <div className="Grid">{images}</div>;
    }

    private _rowHeight = (): number =>
        this.props.width > 500 ? ROW_HEIGHT : MOBILE_ROW_HEIGHT;
}
