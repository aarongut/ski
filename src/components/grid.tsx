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

export const ROW_HEIGHT = 350;
export const MOBILE_ROW_HEIGHT = 150;

interface Row {
  images: Model.Image[];
  width: number;
}

interface BadList {
  splits: number[];
  badness: number;
}

export class Grid extends React.PureComponent<Props, {}> {
  static displayName: string = "Grid";

  private gridHeight = 0;

  static badness = (
    row: Model.Image[],
    width: number,
    height: number
  ): number => {
    const rowWidth = row.reduce((w, img) => w + img.width / img.height, 0);
    const rowHeight = width / rowWidth;

    return (rowHeight - height) * (rowHeight - height);
  };

  // [width][idx] -> badness
  private rowsMemo: Map<number, Map<number, BadList>> = new Map();

  rows(idx: number): BadList {
    const targetHeight = this._rowHeight();

    const memo = this.rowsMemo.get(this.props.width) ?? new Map();
    const maybeMemo = memo.get(idx);

    if (maybeMemo) {
      return maybeMemo;
    }

    if (idx === this.props.images.length) {
      return {
        splits: [],
        badness: 0,
      };
    }
    if (idx === this.props.images.length - 1) {
      const img = this.props.images[idx];
      const h = (img.height * this.props.width) / img.width;
      return {
        splits: [],
        badness: (targetHeight - h) * (targetHeight - h),
      };
    }

    let bestIdx = -1;
    let leastBad = 1e50;
    let bestSplits: number[] = [];

    for (let i = idx + 1; i <= this.props.images.length; i++) {
      const rowBadness = Grid.badness(
        this.props.images.slice(idx, i),
        this.props.width,
        targetHeight
      );
      const rest = this.rows(i);
      const badness = rest.badness + rowBadness;
      if (badness < leastBad) {
        leastBad = badness;
        bestIdx = i;
        bestSplits = [i, ...rest.splits];
      }
    }

    const badList = {
      splits: bestSplits,
      badness: leastBad,
    };

    memo.set(idx, badList);

    if (!this.rowsMemo.has(this.props.width)) {
      this.rowsMemo.set(this.props.width, memo);
    }

    return badList;
  }

  render() {
    this.gridHeight = 0;

    const badList = this.rows(0);
    let lastBreak = 0;
    const rows: Row[] = badList.splits.map((split) => {
      const images = this.props.images.slice(lastBreak, split);
      lastBreak = split;

      return {
        images,
        width: images.reduce((acc, img) => acc + img.width / img.height, 0),
      };
    });

    const images = rows.map((row) => {
      const height = Math.min(this.props.height, this.props.width / row.width);

      const pics = row.images.map((image) => {
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
          key={row.images.map((image) => image.src).join(",")}
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
