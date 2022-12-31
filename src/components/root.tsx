import { BigPicture } from "./big_picture";
import { ImageSet } from "./image_set";
import { SetCover } from "./set_cover";
import * as Model from "../model";

import * as React from "react";

export interface Props {}

export interface State {
  data?: Model.Data | null;
  selectedImage?: Model.Image | null;
  selectedSet?: Model.ImageSet | null;
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
    return Math.min(
      window.innerWidth,
      window.outerWidth || Infinity,
      document.body.clientWidth
    );
  };

  private _viewHeight = (): number => {
    return Math.min(
      window.outerHeight || Infinity,
      document.body.clientHeight || Infinity
    );
  };

  state: State = {
    gridHeights: [],
    pageBottom: this._viewHeight() + window.pageYOffset,
    width: this._viewWidth(),
    height: this._viewHeight(),
  };

  componentDidMount() {
    window
      .fetch(Model.dataUrl)
      .then((data) => data.json())
      .then((json) => this.setState({ data: json }))
      .then(this._loadHash)
      .then(this._onViewChange)
      .catch((e) => console.error("Error fetching data", e));

    window.onresize = this._onViewChange;
    window.onscroll = this._onViewChange;

    try {
      screen.orientation.onchange = this._onViewChange;
    } catch (e) {}

    try {
      window.onorientationchange = this._onViewChange;
    } catch (e) {}

    window.onpopstate = this._loadHash;
  }

  private _renderSet(set: Model.ImageSet) {
    return (
      <ImageSet
        key={set.location + set.description}
        imageSet={set}
        pageBottom={this.state.pageBottom}
        setGridHeight={this._setGridHeight(0)}
        onImageSelected={this._onImageSelected}
        onShowHome={this._onHomeSelected}
        width={this.state.width}
        height={this.state.height}
      />
    );
  }

  private _renderSetCovers(sets: Model.ImageSet[]) {
    return (
      <div className="Root-setCovers">
        {sets.map((set) => (
          <SetCover
            key={set.location + set.description}
            imageSet={set}
            onClick={() => {
              this._onSetSelected(set);
              scrollTo(0, 0);
            }}
            width={Math.min(this.state.width, 400)}
          />
        ))}
      </div>
    );
  }

  render() {
    const imageSets = this.state.data
      ? this.state.selectedSet
        ? this._renderSet(this.state.selectedSet)
        : this._renderSetCovers(this.state.data.sets)
      : null;

    return (
      <div className="Root">
        {this._bigPicture()}
        <h1 onClick={this._onHomeSelected}>Aaron's Ski Pictures</h1>
        {imageSets}
      </div>
    );
  }

  private _bigPicture = () =>
    this.state.selectedImage ? (
      <BigPicture
        image={this.state.selectedImage}
        onClose={this._showGrid}
        showNext={this._showNextBigPicture}
        showPrevious={this._showPreviousBigPicture}
        width={this.state.width}
      />
    ) : null;

  private _loadHash = () => {
    if (window.location.hash.length > 0 && this.state.data) {
      const hash = window.location.hash.slice(1);

      let selectedImage: Model.Image | null = null;
      let selectedSet: Model.ImageSet | null = null;

      this.state.data.sets.forEach((set) => {
        if (this._setToHash(set) === hash) {
          selectedSet = set;
        }

        const image = set.images.find((image) => image.src === hash);
        if (image) {
          selectedImage = image;
          selectedSet = set;
        }
      });

      this.setState({ selectedImage, selectedSet });
    } else {
      this.setState({ selectedImage: null, selectedSet: null });
    }
  };

  private _onViewChange = () => {
    this.setState({
      pageBottom: this._viewHeight() + window.pageYOffset,
      width: this._viewWidth(),
      height: this._viewHeight(),
    });
  };

  private _onImageSelected = (img: Model.Image) => {
    this.setState({ selectedImage: img });
    window.history.pushState(null, "", `#${img.src}`);
  };

  private _onSetSelected = (set: Model.ImageSet) => {
    this.setState({ selectedSet: set });
    document.title =
      set.location + " – " + set.description + " – Skiing - Aaron Gutierrez";
    window.history.pushState(null, "", `#${this._setToHash(set)}`);
  };

  private _onHomeSelected = () => {
    this.setState({
      selectedSet: null,
      selectedImage: null,
    });
    window.history.pushState(null, "", "#");
    document.title = "Skiing - Aaron Gutierrez";
  };

  private _setToHash = (set: Model.ImageSet) =>
    set.location.replace(/[^a-zA-Z0-9-_]/g, "-") +
    "-" +
    set.description.replace(/[^a-zA-Z0-9-_]/g, "-");

  private _showGrid = () => {
    this.setState({ selectedImage: null });
    this._onSetSelected(this.state.selectedSet as Model.ImageSet);
  };

  private _showNextBigPicture = () => {
    const images: Model.Image[] = this.state.selectedSet
      ?.images as Model.Image[];
    const current = images.indexOf(this.state.selectedImage as Model.Image);
    const next = current + 1 >= images.length ? 0 : current + 1;
    this._onImageSelected(images[next]);
  };

  private _showPreviousBigPicture = () => {
    const images: Model.Image[] = this.state.selectedSet
      ?.images as Model.Image[];
    const current = images.indexOf(this.state.selectedImage as Model.Image);
    const previous = current - 1 < 0 ? images.length - 1 : current - 1;
    this._onImageSelected(images[previous]);
  };

  private _setGridHeight = (grid: number) => (height: number) => {
    if (this.state.gridHeights[grid] === height) {
      return;
    }
    this.setState((state) => {
      const newGridHeights = [...state.gridHeights];
      newGridHeights[grid] = height;

      return { gridHeights: newGridHeights };
    });
  };

  private _getPreviousGridHeights = (grid: number): number =>
    this.state.gridHeights.slice(0, grid).reduce((a, b) => a + b, 0);
}
