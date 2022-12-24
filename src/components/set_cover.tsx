import { Picture } from "./picture";
import * as Model from "../model";

import * as React from "react";

export interface Props {
  imageSet: Model.ImageSet;
  onClick: () => void;
  width: number;
}

export interface State {}

export class SetCover extends React.PureComponent<Props, State> {
  static displayName = "SetCover";

  render() {
    const image = this.props.imageSet.images[0];
    const isTall = image.height > image.width;

    const height = isTall
      ? this.props.width
      : (image.height / image.width) * this.props.width;

    const width = isTall
      ? (image.width / image.height) * this.props.width
      : this.props.width;

    return (
      <div className="SetCover" onClick={this.props.onClick}>
        <Picture
          image={image}
          onClick={() => {}}
          height={height}
          width={width}
        />
        <h2>
          <span className="SetCover-location">
            {this.props.imageSet.location}
          </span>
          <span className="SetCover-description">
            {this.props.imageSet.description}
          </span>
        </h2>
      </div>
    );
  }
}
