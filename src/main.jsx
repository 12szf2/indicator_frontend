import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import configureAppStore from "./store/configureStore.js";
import "./store/api/oktatokEgyebTevSlice.js"; // Import to register the API slice
import { setupListeners } from "@reduxjs/toolkit/query";
import Router from "./router/router.jsx";
import { AccessNotificationProvider } from "./contexts/AccessNotificationContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
// Import Tailwind CSS LAST to give it highest priority
import "./index.css";

const muiTheme = createTheme({
  palette: {
    mode: "light", // Force light mode always, ignore system preferences
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: "#000000",
      secondary: "#666666",
    },
  },
  // Ensure components use light theme
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          colorScheme: "light !important", // Force light color scheme
          backgroundColor: "#ffffff !important",
          color: "#000000 !important",
        },
        html: {
          colorScheme: "light !important",
        },
        "*": {
          colorScheme: "light !important",
        },
      },
    },
  },
});

const { store, persistor } = configureAppStore();

setupListeners(store.dispatch);

createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id-here"}>
          <AccessNotificationProvider>
            <Toaster position="bottom-right" />
            <Router />
          </AccessNotificationProvider>
        </GoogleOAuthProvider>
      </PersistGate>
    </Provider>
  </ThemeProvider>
);
