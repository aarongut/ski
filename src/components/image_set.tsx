import { Grid } from "./grid";
import * as Model from "../model";

import * as React from "react";

export interface Props {
    imageSet: Model.ImageSet;
    onImageSelected: (img: Model.Image) => void;
    width: number;
}

export class ImageSet extends React.PureComponent<Props, {}> {
    static displayName = "ImageSet";

    render() {
        return <div className="ImageSet">
            <h2>{ this.props.imageSet.location } · { this.props.imageSet.description }</h2>
            <Grid
                images={ this.props.imageSet.images}
                onImageSelected={ this.props.onImageSelected }
                width={ this.props.width } />
        </div>;
    }
}
