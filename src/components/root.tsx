import { BigPicture } from "./big_picture";
import { Grid } from "./grid";
import * as Model from "../model";

import * as React from "react";

export interface Props {}

export interface State {
    images: Model.Images;
    selectedImage?: string | null;
    width: number;
}

export class Root extends React.PureComponent<Props, State> {
    static displayName = "Root";

    state: State = {
        images: {},
        width: window.innerWidth
    }

    componentDidMount() {
        window.fetch(Model.URL)
            .then(data => data.json())
            .then(json => this.setState({ images: json }))
            .catch(e => console.error("Error fetching data", e));

        window.onresize = () => {
            this.setState({ width: window.innerWidth });
        }

        window.onpopstate = this._loadHash;

        this._loadHash();
    }

    render() {
        return <div className="Root">
                { this._bigPicture() }
                <h1>Ski</h1>
                <h2>CMH Galena</h2>
                <Grid
                    images={ this.state.images }
                    onImageSelected={ this._onImageSelected }
                    width={ this.state.width } />
            </div>;
    }

    private _bigPicture = () => {
        if (this.state.selectedImage && this.state.images[this.state.selectedImage]) {
            return <BigPicture
                image={this.state.images[this.state.selectedImage]}
                src={this.state.selectedImage}
                onClose={this._showGrid}
                width={this.state.width}
            />
        } else {
            return null;
        }
    }

    private _loadHash = () => {
        if (window.location.hash.length > 0) {
            this.setState({ selectedImage: window.location.hash.slice(1) });
        } else {
            this.setState({ selectedImage: null });
        }
    }

    private _onImageSelected = (key: string) => {
        this.setState({ selectedImage: key });
        window.history.pushState(null, "", `#${key}`);
    }

    private _showGrid = () => {
        this.setState({ selectedImage: null });
        window.history.pushState(null, "", "#");
    }
}
