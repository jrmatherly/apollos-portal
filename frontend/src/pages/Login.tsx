import { LogIn, Shield, Zap } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const { isAuthenticated, isLoading, login, error } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-text-primary">Apollos AI</h1>
          </div>
          <p className="text-text-secondary">Self-Service Portal</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Sign In</h2>
          </div>

          <p className="text-text-secondary text-sm mb-6">
            Sign in with your organization account to access the AI portal.
          </p>

          {error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-6">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={login}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Microsoft
          </button>

          <p className="text-text-muted text-xs text-center mt-6">
            Access requires membership in an authorized security group.
          </p>
        </div>
      </div>
    </div>
  );
}
