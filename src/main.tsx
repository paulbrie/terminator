import ReactDOM from "react-dom/client";
import App from "./App";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@xterm/xterm/css/xterm.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <TooltipProvider delay={300}>
    <App />
  </TooltipProvider>
);
