import * as Model from "../model";

import * as React from "react";

export interface Props {
    src: string;
    image: Model.Image;
    onClick: () => void;
    selected?: boolean;
    width: number;
}

export class Picture extends React.PureComponent<Props, {}> {
    static displayName = "Picture";

    render() {
        const src = `img/600/${this.props.src}`;
        return <img
            className={ this.props.selected ? "Picture-selected" : ""}
            onClick={this.props.onClick}
            srcSet={this._srcset()}
            src={src}
            width={ this.props.selected ? "100%" : this.props.width + "px" }
        />;
    }

    private _srcset = (): string => {
        const srcs: string[] = [];

        Model.SIZES.forEach(size => {
            const width = this.props.image.width > this.props.image.height
                ? size
                : this.props.image.width / this.props.image.height * size;

            const scale = width / this.props.width;

            if (scale >= 1) {
                srcs.push(`img/${size}/${this.props.src} ${scale}x`);
            }
        });

        return srcs.join(",");
    }
}
