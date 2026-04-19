import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Delete from "./components/Delete";
import "./dns.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Delete />
    </BrowserRouter>
  </React.StrictMode>,
);
