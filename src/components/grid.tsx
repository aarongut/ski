import { Picture } from "./picture";
import * as Model from "../model";

import * as React from "react";

export interface Props {
  images: Model.Image[];
  onImageSelected: (image: Model.Image) => void;
  width: number;
}

export const ROW_HEIGHT = 200;
export const MOBILE_ROW_HEIGHT = 100;

interface Row {
  images: Model.Image[];
  width: number;
}

export class Grid extends React.PureComponent<Props, {}> {
  static displayName = "Grid";

  render() {
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
      const height = this.props.width / row.width;

      const pics = row.images.map(image => {
        return (
          <Picture
            image={image}
            onClick={() => this.props.onImageSelected(image)}
            key={image.src}
            width={(image.width / image.height) * height}
          />
        );
      });
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
    this.props.width > 500 ? ROW_HEIGHT : MOBILE_ROW_HEIGHT;
}
