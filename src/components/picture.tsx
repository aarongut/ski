import * as Model from "../model";

import * as React from "react";

export interface Props {
  image: Model.Image;
  onClick: () => void;
  width: number;
}

interface SrcSetInfo {
    srcSet: string;
    bestSrc: string;
}

export class Picture extends React.PureComponent<Props, {}> {
  static displayName = "Picture";

  render() {
    const srcSet = this._srcset();
      
    return (
      <img
        onClick={this.props.onClick}
        srcSet={srcSet.srcSet}
        src={srcSet.bestSrc}
        width={this.props.width + "px"}
      />
    );
  }

  private _srcset = (): SrcSetInfo => {
    const srcs: string[] = [];
    let bestSize = 1600;
    let bestRatio = Infinity;

    Model.SIZES.forEach(size => {
      const width =
        this.props.image.width > this.props.image.height
          ? size
          : (this.props.image.width / this.props.image.height) * size;

      const scale = width / this.props.width;

      if (scale >= 1) {
        srcs.push(`img/${size}/${this.props.image.src} ${scale}x`);
          if (scale < bestRatio) {
              bestSize = size;
            bestRatio = scale;
          }
      }
    });

      srcs.push(`img/${bestSize}/${this.props.image.src} 1x`);

    return {
        srcSet: srcs.join(","),
        bestSrc: `img/${bestSize}/${this.props.image.src}` 
    };
  };
}
