import * as React from "react";
import * as Model from "@/model";
import { Picture } from "@/components/picture";

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

const badness = (row: Model.Image[], width: number, height: number): number => {
  const rowWidth = row.reduce((w, img) => w + img.width / img.height, 0);
  const rowHeight = width / rowWidth;

  return (rowHeight - height) * (rowHeight - height);
};

export const Grid: React.FC<Props> = ({ images, onImageSelected, pageBottom, width, height }) => {
  const rowsMemo = React.useRef<Map<number, Map<number, BadList>>>(new Map());
  const targetRowHeight = width > 900 ? ROW_HEIGHT : MOBILE_ROW_HEIGHT;

  React.useEffect(() => {
    // The memoized rows depend on the image list; clear when the set changes
    rowsMemo.current.clear();
  }, [images]);

  const rowsFor = (idx: number): BadList => {
    const memo = rowsMemo.current.get(width) ?? new Map();
    const maybeMemo = memo.get(idx);

    if (maybeMemo) {
      return maybeMemo;
    }

    if (idx === images.length) {
      return {
        splits: [],
        badness: 0,
      };
    }
    if (idx === images.length - 1) {
      const img = images[idx];
      const h = (img.height * width) / img.width;
      return {
        splits: [],
        badness: (targetRowHeight - h) * (targetRowHeight - h),
      };
    }

    let leastBad = 1e50;
    let bestSplits: number[] = [];

    for (let i = idx + 1; i <= images.length; i++) {
      const rowBadness = badness(images.slice(idx, i), width, targetRowHeight);
      const rest = rowsFor(i);
      const totalBadness = rest.badness + rowBadness;
      if (totalBadness < leastBad) {
        leastBad = totalBadness;
        bestSplits = [i, ...rest.splits];
      }
    }

    const badList = {
      splits: bestSplits,
      badness: leastBad,
    };

    memo.set(idx, badList);

    if (!rowsMemo.current.has(width)) {
      rowsMemo.current.set(width, memo);
    }

    return badList;
  };

  let gridHeight = 0;

  const badList = rowsFor(0);
  let lastBreak = 0;
  const rows: Row[] = badList.splits.map((split) => {
    const slice = images.slice(lastBreak, split);
    lastBreak = split;

    return {
      images: slice,
      width: slice.reduce((acc, img) => acc + img.width / img.height, 0),
    };
  });

  const pictures = rows.map((row) => {
    const rowHeight = Math.min(height, width / row.width);

    const pics = row.images.map((image) => {
      const scaledWidth = (image.width / image.height) * rowHeight;
      const defer = gridHeight > pageBottom;
      return (
        <Picture
          image={image}
          onClick={() => onImageSelected(image)}
          key={image.src}
          height={rowHeight}
          width={scaledWidth}
          defer={defer}
        />
      );
    });

    gridHeight += rowHeight;

    return (
      <div
        className="Grid-row"
        style={{ height: rowHeight + "px" }}
        key={row.images.map((image) => image.src).join(",")}
      >
        {pics}
      </div>
    );
  });

  return <div className="Grid">{pictures}</div>;
};
