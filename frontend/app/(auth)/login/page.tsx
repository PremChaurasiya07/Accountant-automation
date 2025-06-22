"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { handleEmailAuth, startGoogleOAuth } from "../../../utils/auth"; // Make sure this path is correct

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    const result = await handleEmailAuth(email, password);
    setLoading(false);
    if (result.success) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get("redirect") || "/";
      router.push(redirectTo);
    } else {
      setError(result.error || "Something went wrong");
    }
  };

  const handleGoogleLogin = async() => {
    startGoogleOAuth(); // Triggers OAuth redirect
    
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow bg-white dark:bg-gray-900">
      <h1 className="text-2xl font-bold mb-4 text-center">Welcome 👋</h1>

      <input
        type="email"
        className="w-full mb-3 px-4 py-2 border rounded bg-gray-100 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        className="w-full mb-4 px-4 py-2 border rounded bg-gray-100 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mb-3 py-2 px-4 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Continue with Email"}
      </button>

      <div className="text-center my-4 text-gray-500">or</div>

      <button
        onClick={handleGoogleLogin}
        className="w-full py-2 px-4 rounded border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <img
          src="/google-icon.svg"
          alt="Google logo"
          className="w-5 h-5 mr-2"
        />
        Continue with Google
      </button>

      {typeof error === "string" && error && (
        <p className="text-red-500 mt-4 text-center">{error}</p>
      )}
    </div>
  );
}
