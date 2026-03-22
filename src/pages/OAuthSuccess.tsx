import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
          navigate("/login");
          return;
        }

        // Save token
        localStorage.setItem("token", token);

        const res = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch user");
        }

        // Save user info
        localStorage.setItem("user", JSON.stringify(data.user));

        // Update auth context
        login();

        // Redirect to dashboard
        navigate("/", { replace: true });

      } catch (error) {
        console.error("OAuth login failed:", error);
        navigate("/login");
      }
    };

    run();
  }, [login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 text-lg">
      Logging you in with Google...
    </div>
  );
}