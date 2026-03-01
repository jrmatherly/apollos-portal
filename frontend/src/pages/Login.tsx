import { Lock } from "lucide-react";
import { motion } from "motion/react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function MicrosoftLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 21 21"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="10" height="10" fill="#f25022" />
      <rect x="11" y="0" width="10" height="10" fill="#7fba00" />
      <rect x="0" y="11" width="10" height="10" fill="#00a4ef" />
      <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-primary px-4 py-8 sm:px-6">
      {/* Background glow spheres */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 0.15,
            x: [0, 50, 0],
            y: [0, 100, 0],
          }}
          transition={{
            opacity: { duration: 1.5 },
            x: {
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            },
            y: {
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            },
          }}
          className="absolute -top-[10%] -left-[5%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,#6366f1,transparent)] blur-[80px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 0.15,
            x: [0, -80, 0],
            y: [0, -50, 0],
          }}
          transition={{
            opacity: { duration: 1.5, delay: 0.3 },
            x: {
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            },
            y: {
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            },
          }}
          className="absolute -bottom-[10%] -right-[5%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,#8b5cf6,transparent)] blur-[80px]"
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <main className="relative z-10 w-full max-w-md px-2 sm:px-6 flex flex-col items-center">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-8 sm:mb-10"
        >
          <motion.img
            src="/apollos_new_circle_no_bg_sm.png"
            alt="Apollos AI"
            className="mx-auto h-20 w-20 sm:h-24 sm:w-24 mb-5 sm:mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-2">
            Apollos AI
          </h1>
          <p className="text-text-secondary font-medium tracking-wide uppercase text-xs sm:text-sm">
            Self-Service Portal
          </p>
        </motion.header>

        {/* Sign-in card */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="w-full rounded-2xl border border-white/10 bg-surface/70 p-6 sm:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md transition-[border-color] duration-500 hover:border-white/20"
        >
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-text-primary mb-2">Sign In</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Sign in with your organization account to access the enterprise AI portal.
            </p>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-6"
            >
              <p className="text-destructive text-sm">{error}</p>
            </motion.div>
          ) : null}

          <motion.button
            type="button"
            onClick={login}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <MicrosoftLogo />
            Sign in with Microsoft
          </motion.button>

          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/5">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted leading-normal">
                Access requires membership in an authorized security group. Unauthorized access is
                strictly prohibited.
              </p>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
