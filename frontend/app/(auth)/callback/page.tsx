"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove '#'
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token })
        .then(() => {
          window.history.replaceState({}, document.title, "/"); // clean up URL
          router.push("/"); // or wherever you want to go
        });
    } else {
      console.error("Missing tokens in callback URL");
      router.push("/login");
    }
  }, [router]);

  return <div className="text-center mt-20 text-gray-600 dark:text-gray-300">Signing you in...</div>;
}
