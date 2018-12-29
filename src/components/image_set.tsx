import { Grid } from "./grid";
import * as Model from "../model";

import * as React from "react";

export interface Props {
  imageSet: Model.ImageSet;
  onImageSelected: (img: Model.Image) => void;
  setGridHeight: (height: number) => void;
  pageBottom: number;
  width: number;
}

export class ImageSet extends React.PureComponent<Props, {}> {
  static displayName = "ImageSet";

  private divRef: React.RefObject<HTMLDivElement> = React.createRef();

  render() {
    return (
      <div className="ImageSet" ref={this.divRef}>
        <h2>
          {this.props.imageSet.location} · {this.props.imageSet.description}
        </h2>
        <Grid
          images={this.props.imageSet.images}
          onImageSelected={this.props.onImageSelected}
          pageBottom={this.props.pageBottom}
          width={this.props.width}
        />
      </div>
    );
  }

  componentDidMount() {
    this._setGridHeight();
  }

  componentDidUpdate() {
    this._setGridHeight();
  }

  private _setGridHeight = () => {
    if (this.divRef.current) {
      this.props.setGridHeight(this.divRef.current.clientHeight);
    }
  };
}
