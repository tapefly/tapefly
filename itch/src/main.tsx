import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "../../app/globals.css";
import "../../app/workshop/workshop.css";
import "./portal.css";
import { createRoot } from "react-dom/client";
import Workshop from "../../app/workshop/Workshop";
import { LangProvider } from "./portal-lang";

createRoot(document.getElementById("root")!).render(
  <LangProvider initial="en">
    <Workshop portalMode />
  </LangProvider>,
);
