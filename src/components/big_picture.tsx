import * as Model from "../model";

import * as React from "react";

export interface Props {
    image: Model.Image;
    onClose: () => void;
    width: number;
}

export class BigPicture extends React.PureComponent<Props, {}> {
    static displayName = "BigPicture";

    render() {
        const src = `img/1600/${this.props.image.src}`;
        return <div className="BigPicture">
            <div
                className="BigPicture-image"
                style={{
                    backgroundImage: `url(${src})`
                }}>
            </div>
            <div className="BigPicture-footer">
                <a className="BigPicture-footerLink"
                    href={`img/${this.props.image.src}`}
                    target="_blank">
                    Download
                </a>
                <span className="BigPicture-footerLink"
                    onClick={this.props.onClose}
                    onKeyPress={this._keyPress}
                    tabIndex={0} >
                    Close
                </span>
            </div>
        </div>;
    }

    private _keyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            this.props.onClose();
        }
    }
}
