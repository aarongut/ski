import { Grid } from "./grid";
import * as Model from "../model";

import * as React from "react";

export interface Props {}

export interface State {
    images: Model.Images;
    selectedIamge?: string | null;
    width: number;
}

export class Root extends React.PureComponent<Props, State> {
    static displayName = "Root";

    state = {
        images: {},
        selectedImage: null,
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
    }

    render() {
        return <div className="Root">
                <h1>Ski</h1>
                <hr />
                <Grid
                    images={ this.state.images }
                    onImageSelected={ this._onImageSelected }
                    selectedImage={ this.state.selectedImage }
                    width={ this.state.width } />
            </div>;
    }

    private _onImageSelected = (key: string) => {
        this.setState(state => ({
            ...state,
            selectedImage: key
        }));
    }
}
