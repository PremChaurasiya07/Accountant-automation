// utils/auth.ts
export const handleEmailAuth = async (email: string, password: string) => {
  try {
    const res = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Required for cookies
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      return { success: true };
    }

    const error = await res.json();

    if (error.detail.includes("Invalid login credentials")) {
      const signupRes = await fetch("http://localhost:8000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (signupRes.ok) {
        return { success: true };
      } else {
        const signupError = await signupRes.json();
        return { success: false, error: signupError.detail };
      }
    }

    return { success: false, error: error.detail };
  } catch (err: any) {
    return { success: false, error: err.message || "Something went wrong" };
  }
};


export const startGoogleOAuth = () => {
  window.location.href = `https://uphbohvnxayrtkxxdizk.supabase.co/auth/v1/authorize?provider=google&redirect_to=http://localhost:3000`;

};


