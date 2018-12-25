import { Root } from "./root";

import * as React from "react";
import * as ReactDOM from "react-dom";

window.onload = () => {
    const body = document.getElementById("mount");

    const root = <Root name="Friend" />;
    ReactDOM.render(root, body);
};
