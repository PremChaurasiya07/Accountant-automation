
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleEmailAuth, startGoogleOAuth } from "../../../utils/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // New state for success messages
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setShowForm(true);
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await handleEmailAuth(email, password);
    setLoading(false);

    if (result.success) {
      if (result.needsConfirmation) {
        // New account created, show confirmation message
        setSuccessMessage("Account created! Please check your email to confirm and sign in.");
      } else {
        // Existing user logged in, redirect
        const searchParams = new URLSearchParams(window.location.search);
        const redirectTo = searchParams.get("redirect") || "/";
        router.push(redirectTo);
      }
    } else {
      setError(result.error || "Something went wrong");
    }
  };

  const handleGoogleLogin = () => {
    startGoogleOAuth();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div
        className={`max-w-md w-full p-8 border rounded-xl shadow-xl bg-white dark:bg-gray-900 transform transition-all duration-700 ${
          showForm ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          Welcome 👋
        </h1>

        {/* Display success or error message */}
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        {successMessage && <p className="text-green-500 mb-4 text-center">{successMessage}</p>}
        
        {/* Hide form inputs if confirmation message is shown */}
        {!successMessage && (
          <>
            {/* <input
              type="email"
              className="w-full mb-4 px-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full mb-6 px-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mb-4 py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:scale-[1.03] hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "Loading..." : "Continue with Email"}
            </button>

            <div className="text-center my-4 text-gray-500 dark:text-gray-400">or</div> */}

            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-lg border flex items-center justify-center gap-2 hover:scale-[1.03] hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <img
                src="/google-icon.svg"
                alt="Google logo"
                className="w-5 h-5"
              />
              <span className="font-medium">Continue with Google</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}