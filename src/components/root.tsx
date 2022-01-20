import { BigPicture } from "./big_picture";
import { ImageSet } from "./image_set";
import * as Model from "../model";

import * as React from "react";

export interface Props {}

export interface State {
  data?: Model.Data | null;
  selectedImage?: Model.Image | null;
  gridHeights: number[];
  pageBottom: number;
  width: number;
  height: number;
}

export class Root extends React.PureComponent<Props, State> {
  static displayName = "Root";

  // innerWidth gets messed up when rotating phones from landscape -> portrait,
  // and chrome seems to not report innerWidth correctly when scrollbars are present
  private _viewWidth = (): number => {
    // iOS Safari does not set outerWidth/outerHeight
    if (!window.outerWidth) {
      return window.innerWidth;
    }

    return Math.min(
      window.innerWidth,
      window.outerWidth,
      document.getElementById("mount")!.clientWidth
    );
  };
  private _viewHeight = (): number => {
    // iOS Safari does not set outerWidth/outerHeight
    if (!window.outerHeight) {
      return window.innerHeight;
    }

    return Math.min(
      window.innerHeight,
      window.outerHeight,
      document.body.clientHeight
    );
  };

  state: State = {
    gridHeights: [],
    pageBottom: window.innerHeight + window.pageYOffset,
    width: this._viewWidth(),
    height: this._viewHeight()
  };

  componentDidMount() {
    window
      .fetch(Model.dataUrl)
      .then(data => data.json())
      .then(json => this.setState({ data: json }))
      .then(this._loadHash)
      .then(this._onViewChange)
      .catch(e => console.error("Error fetching data", e));

    window.onresize = this._onViewChange;
    window.onscroll = this._onViewChange;

    window.onpopstate = this._loadHash;
  }

  render() {
    const imageSets = this.state.data
      ? this.state.data.sets.map((set, idx) => (
          <ImageSet
            key={set.location + set.description}
            imageSet={set}
            pageBottom={
              this.state.pageBottom - this._getPreviousGridHeights(idx)
            }
            setGridHeight={this._setGridHeight(idx)}
            onImageSelected={this._onImageSelected}
            width={this.state.width}
            height={this.state.height}
          />
        ))
      : null;

    return (
      <div className="Root">
        {this._bigPicture()}
        <h1>Aaron's Ski Pictures</h1>
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
        height={this.state.height}
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

  private _onViewChange = () => {
    this.setState({
      pageBottom: window.innerHeight + window.pageYOffset,
      width: this._viewWidth(),
      height: this._viewHeight(),
    });
  };

  private _onImageSelected = (img: Model.Image) => {
    this.setState({ selectedImage: img });
    window.history.pushState(null, "", `#${img.src}`);
  };

  private _showGrid = () => {
    this.setState({ selectedImage: null });
    window.history.pushState(null, "", "#");
  };

  private _setGridHeight = (grid: number) => (height: number) => {
    if (this.state.gridHeights[grid] === height) {
      return;
    }
    this.setState(state => {
      const newGridHeights = [...state.gridHeights];
      newGridHeights[grid] = height;

      return { gridHeights: newGridHeights };
    });
  };

  private _getPreviousGridHeights = (grid: number): number =>
    this.state.gridHeights.slice(0, grid).reduce((a, b) => a + b, 0);
}
