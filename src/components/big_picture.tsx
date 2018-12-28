import * as Model from "../model";

import * as React from "react";

export interface Props {
    src: string;
    image: Model.Image;
    onClose: () => void;
    width: number;
}

export class BigPicture extends React.PureComponent<Props, {}> {
    static displayName = "BigPicture";

    render() {
        const src = `img/1600/${this.props.src}`;
        return <div className="BigPicture">
            <div
                className="BigPicture-image"
                style={{
                    backgroundImage: `url(${src})`
                }}>
            </div>
            <div className="BigPicture-footer">
                <a className="BigPicture-footerLink"
                    href={`img/${this.props.src}`}
                    target="_blank">
                    Download
                </a>
                <span className="BigPicture-footerLink"
                    onClick={this.props.onClose}
                    tabIndex={1} >
                    Close
                </span>
            </div>
        </div>;
    }
}
