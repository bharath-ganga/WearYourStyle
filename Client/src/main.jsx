// Disable React DevTools warning prompt
if (typeof window !== "undefined") {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: true,
  };
  
  // Mute specific benign console warnings in development
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args.map(arg => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");
    if (
      msg.includes("React Router Future Flag Warning") ||
      msg.includes("React DevTools") ||
      msg.includes("deprecations") ||
      msg.includes("defaultProps")
    ) {
      return;
    }
    originalWarn(...args);
  };
}

import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { store } from "./redux/store.js";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { VirtualTryOnProvider } from "./context/VirtualTryOnContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <VirtualTryOnProvider>
  <Provider store={store}>
    <App />
    <Toaster />
  </Provider>
  </VirtualTryOnProvider>
);