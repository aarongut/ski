import * as Model from "../model";
import { Picture } from "./picture";

import * as React from "react";

export interface Props {
  image: Model.Image;
  onClose: () => void;
  showNext: () => void;
  showPrevious: () => void;
  width: number;
}

interface TouchStart {
  x: number;
  y: number;
}

export interface State {
  touchStart?: TouchStart | null;
}

export class BigPicture extends React.PureComponent<Props, State> {
  static displayName = "BigPicture";

  componentDidMount() {
    window.addEventListener("keyup", this._onEscape as any);
    window.addEventListener("touchstart", this._onTouchStart as any);
    window.addEventListener("touchend", this._onTouchEnd as any);
    document.body.classList.add("no-scroll");
  }

  componentWillUnmount() {
    window.removeEventListener("keyup", this._onEscape as any);
    window.removeEventListener("touchstart", this._onTouchStart as any);
    window.removeEventListener("touchend", this._onTouchEnd as any);
    document.body.classList.remove("no-scroll");
  }

  render() {
    const scaleWidth = this.props.image.width / this.props.width;
    const scaleHeight = this.props.image.height / (window.innerHeight - 80);
    const scale = Math.max(scaleWidth, scaleHeight);

    return (
      <div className="BigPicture">
        <Picture
          image={this.props.image}
          onClick={() => {}}
          height={this.props.image.height / scale}
          width={this.props.image.width / scale}
        />
        <div className="BigPicture-footer">
          <a
            className="BigPicture-footerLink"
            href={`img/${this.props.image.src}`}
            target="_blank"
          >
            ⬇ Download
          </a>
          <span
            className="BigPicture-footerLink"
            role="button"
            onClick={this.props.onClose}
            onKeyPress={this._keyPress}
            tabIndex={0}
          >
            Close
          </span>
        </div>
      </div>
    );
  }

  private _keyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      this.props.onClose();
    }
  };

  private _onEscape = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      this.props.onClose();
    }
  };

  private _onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    this.setState({ touchStart: { x: touch.screenX, y: touch.screenY } });
  };

  private _onTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const touchStart = this.state.touchStart as TouchStart;

    const dx = touch.screenX - touchStart.x;

    if (Math.abs(dx) / window.innerWidth > 0.05) {
      if (dx < 0) {
        this.props.showNext();
      } else {
        this.props.showPrevious();
      }
    }

    this.setState({ touchStart: null });
  };
}
