import { Picture } from "./picture";
import * as Model from "../model";

import * as React from "react";

export interface Props {
  images: Model.Image[];
  onImageSelected: (image: Model.Image) => void;
  pageBottom: number;
  width: number;
  height: number;
}

export const ROW_HEIGHT = 250;
export const MOBILE_ROW_HEIGHT = 150;

interface Row {
  images: Model.Image[];
  width: number;
}

export class Grid extends React.PureComponent<Props, {}> {
    static displayName: string = "Grid";

  private gridHeight = 0;

  render() {
    this.gridHeight = 0;

    let row: Model.Image[] = [];
    const rows: Row[] = [];
    let rowWidth = 0;

    this.props.images.forEach(image => {
      const newWidth = rowWidth + image.width / image.height;
      const height = this.props.width / newWidth;

      if (height < this._rowHeight()) {
        rows.push({
          images: row,
          width: rowWidth
        });

        row = [];
        rowWidth = image.width / image.height;
      } else {
        rowWidth = newWidth;
      }
      row.push(image);
    });
    rows.push({
      images: row,
      width: rowWidth
    });

    const images = rows.map(row => {
      const height = Math.min(this.props.height, this.props.width / row.width);

      const pics = row.images.map(image => {
        return (
          <Picture
            image={image}
            onClick={() => this.props.onImageSelected(image)}
            key={image.src}
            height={height}
            width={(image.width / image.height) * height}
            defer={this.gridHeight > this.props.pageBottom}
          />
        );
      });

      this.gridHeight += height;

      return (
        <div
          className="Grid-row"
          style={{ height: height + "px" }}
          key={row.images.map(image => image.src).join(",")}
        >
          {pics}
        </div>
      );
    });

    return <div className="Grid">{images}</div>;
  }

  private _rowHeight = (): number =>
    this.props.width > 900 ? ROW_HEIGHT : MOBILE_ROW_HEIGHT;
}
