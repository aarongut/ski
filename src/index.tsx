import { Root } from "./components/root";

import { createRoot } from "react-dom/client";

const body = document.getElementById("mount") as HTMLElement;
const root = createRoot(body);
root.render(<Root />);
