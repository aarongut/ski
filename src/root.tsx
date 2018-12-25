import * as React from "react";

export interface Props {
    name: String;
}

export interface State {}

export class Root extends React.PureComponent<Props, State> {
    static displayName = "Root";

    render() {
        return <h1>Hello, {this.props.name}!</h1>;
    }
}
