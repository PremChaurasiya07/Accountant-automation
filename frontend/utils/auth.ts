// // utils/auth.ts
// export const handleEmailAuth = async (email: string, password: string) => {
//   try {
//     const res = await fetch("/login", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include", // Required for cookies
//       body: JSON.stringify({ email, password }),
//     });

//     if (res.ok) {
//       return { success: true };
//     }

//     const error = await res.json();

//     if (error.detail.includes("Invalid login credentials")) {
//       const signupRes = await fetch("/signup", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify({ email, password }),
//       });

//       if (signupRes.ok) {
//         return { success: true };
//       } else {
//         const signupError = await signupRes.json();
//         return { success: false, error: signupError.detail };
//       }
//     }

//     return { success: false, error: error.detail };
//   } catch (err: any) {
//     return { success: false, error: err.message || "Something went wrong" };
//   }
// };


// export const startGoogleOAuth = () => {
//   window.location.href = `https://uphbohvnxayrtkxxdizk.supabase.co/auth/v1/authorize?provider=google&redirect_to=${process.env.NEXT_PUBLIC_LOGIN_REDIRECT}`;

// };

// utils/auth.ts
import { supabase } from "@/lib/supabase"; // Make sure you import supabase client

export const handleEmailAuth = async (email: string, password: string) => {
  try {
    // First, try to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError) {
      // Login was successful
      return { success: true, error: null };
    }

    // If sign-in fails, check if it's because the user doesn't exist
    if (signInError.message.includes("Invalid login credentials")) {
      // User doesn't exist, so let's try to sign them up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        // Handle sign-up errors (e.g., password too short)
        return { success: false, error: signUpError.message };
      }

      // If Supabase email confirmation is enabled (default), user is not null but session is
      if (data.user && !data.session) {
        return { 
          success: true, 
          needsConfirmation: true, // Send a special flag to the frontend
          error: null 
        };
      }
      
      // If confirmation is disabled, this part will log them in directly
      return { success: true, needsConfirmation: false, error: null };
    }

    // Handle other sign-in errors
    return { success: false, error: signInError.message };

  } catch (err: any) {
    return { success: false, error: err.message || "Something went wrong" };
  }
};

export const startGoogleOAuth = () => {
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`, // Redirect back to home page after auth
    },
  });
};
