import { type AccountInfo, InteractionRequiredAuthError } from "@azure/msal-browser";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { loginRequest, msalInstance } from "../lib/msal";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // MSAL v5 requires explicit initialization before use
        await msalInstance.initialize();

        // Handle redirect response (if returning from login)
        const response = await msalInstance.handleRedirectPromise();
        if (response?.account) {
          msalInstance.setActiveAccount(response.account);
          setUser(response.account);
        } else {
          // Check for existing session
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
            setUser(accounts[0]);
          }
        }
      } catch (err) {
        console.error("MSAL init error:", err);
        setError("Authentication initialization failed");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async () => {
    try {
      setError(null);
      await msalInstance.loginRedirect(loginRequest);
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await msalInstance.logoutRedirect({ postLogoutRedirectUri: "/" });
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const account = msalInstance.getActiveAccount();
    if (!account) {
      throw new Error("No active account");
    }

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        // Token expired or needs re-auth — redirect to login
        await msalInstance.loginRedirect(loginRequest);
        throw new Error("Re-authentication required");
      }
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        login,
        logout,
        getAccessToken,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
