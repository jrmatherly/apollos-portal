import { type Configuration, LogLevel, PublicClientApplication } from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "common"}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || "http://localhost:3000/auth/callback",
    postLogoutRedirectUri: "/",
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) {
          console.error(message);
        }
      },
    },
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Scopes for user login — just profile + email, groups resolved via backend Graph API
export const loginRequest = {
  scopes: ["User.Read", "openid", "profile", "email"],
};
