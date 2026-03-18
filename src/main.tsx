import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles/tokens.css";
import "./styles/globals.css";
import "./styles/responsive.css";
import { App } from "./app/App";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
