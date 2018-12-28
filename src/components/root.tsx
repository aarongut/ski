import { BigPicture } from "./big_picture";
import { ImageSet } from "./image_set";
import * as Model from "../model";

import * as React from "react";

export interface Props {}

export interface State {
  data?: Model.Data | null;
  selectedImage?: Model.Image | null;
  width: number;
}

export class Root extends React.PureComponent<Props, State> {
  static displayName = "Root";

  state: State = {
    width: window.innerWidth
  };

  componentDidMount() {
    window
      .fetch(Model.URL)
      .then(data => data.json())
      .then(json => this.setState({ data: json }))
      .then(this._loadHash)
      .catch(e => console.error("Error fetching data", e));

    window.onresize = () => {
      this.setState({ width: window.innerWidth });
    };

    window.onpopstate = this._loadHash;
  }

  render() {
    const imageSets = this.state.data
      ? this.state.data.sets.map(set => (
          <ImageSet
            key={set.location + set.description}
            imageSet={set}
            onImageSelected={this._onImageSelected}
            width={this.state.width}
          />
        ))
      : null;

    return (
      <div className="Root">
        {this._bigPicture()}
        <h1>Ski</h1>
        {imageSets}
      </div>
    );
  }

  private _bigPicture = () =>
    this.state.selectedImage ? (
      <BigPicture
        image={this.state.selectedImage}
        onClose={this._showGrid}
        width={this.state.width}
      />
    ) : null;

  private _loadHash = () => {
    if (window.location.hash.length > 0 && this.state.data) {
      const src = window.location.hash.slice(1);
      let selectedImage: Model.Image | null = null;

      this.state.data.sets.forEach(set => {
        const image = set.images.find(image => image.src === src);
        if (image) {
          selectedImage = image;
        }
      });

      this.setState({ selectedImage: selectedImage });
    } else {
      this.setState({ selectedImage: null });
    }
  };

  private _onImageSelected = (img: Model.Image) => {
    this.setState({ selectedImage: img });
    window.history.pushState(null, "", `#${img.src}`);
  };

  private _showGrid = () => {
    this.setState({ selectedImage: null });
    window.history.pushState(null, "", "#");
  };
}
