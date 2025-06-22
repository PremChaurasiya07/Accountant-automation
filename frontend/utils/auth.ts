// utils/auth.ts
export const handleEmailAuth = async (email: string, password: string) => {
  try {
    const res = await fetch("/login", {
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
      const signupRes = await fetch("/signup", {
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
  window.location.href = `https://uphbohvnxayrtkxxdizk.supabase.co/auth/v1/authorize?provider=google&redirect_to=https://vyapari.vercel.app/`;

};


