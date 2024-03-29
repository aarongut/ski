import * as Model from "../model";

import * as React from "react";

export interface Props {
  image: Model.Image;
  onClick: () => void;
  height: number;
  width: number;
  defer?: boolean;
}

export interface State {
  isMounted: boolean;
}

interface SrcSetInfo {
  jpeg: string;
  webp: string;
  bestSrc: string;
}

export class Picture extends React.PureComponent<Props, State> {
  static displayName = "Picture";

  state: State = {
    isMounted: false,
  };

  componentDidMount() {
    this.setState({ isMounted: true });
  }

  render() {
    if (this.props.defer || !this.state.isMounted) {
      return (
        <div
          className="Picture-defer"
          style={{ width: this.props.width + "px" }}
        />
      );
    }

    const srcSet = this._srcset();

    return (
      <picture>
        <source srcSet={srcSet.webp} type="image/webp" />
        <source srcSet={srcSet.jpeg} type="image/jpeg" />
        <img
          id={this.props.image.src}
          onClick={this.props.onClick}
          src={srcSet.bestSrc}
          height={this.props.height + "px"}
          width={Math.floor(this.props.width) + "px"}
        />
      </picture>
    );
  }

  private _srcset = (): SrcSetInfo => {
    const jpegSrcSet: string[] = [];
    const webpSrcSet: string[] = [];
    let bestSize = 800;
    let bestScale = Infinity;

    Model.SIZES.forEach((size) => {
      const width =
        this.props.image.width > this.props.image.height
          ? size
          : (this.props.image.width / this.props.image.height) * size;

      const scale = width / this.props.width;

      if (scale >= 1 || size === 2400) {
        const jpeg = `img/${size}/${this.props.image.src}`;
        const webp = jpeg.replace("jpg", "webp");
        jpegSrcSet.push(`${jpeg} ${scale}x`);
        webpSrcSet.push(`${webp} ${scale}x`);
        if (scale < bestScale) {
          bestSize = size;
          bestScale = scale;
        }
      }
    });

    return {
      jpeg: jpegSrcSet.join(","),
      webp: webpSrcSet.join(","),
      bestSrc: `img/${bestSize}/${this.props.image.src}`,
    };
  };
}
