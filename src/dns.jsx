import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Dns from "./components/Dns";
import "./dns.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Dns />
    </BrowserRouter>
  </React.StrictMode>,
);
