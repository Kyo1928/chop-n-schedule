import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthError, AuthApiError } from "@supabase/supabase-js";

export const AuthForm = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session); // Debug log
        
        if (event === "SIGNED_IN" && session) {
          console.log("User signed in, redirecting..."); // Debug log
          navigate("/");
        }
        if (event === "USER_UPDATED" || event === "PASSWORD_RECOVERY") {
          const checkSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
              console.error("Session error:", error); // Debug log
              setError(getErrorMessage(error));
            }
          };
          checkSession();
        }
        if (event === "SIGNED_OUT") {
          setError("");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">
            Sign in to your account or create a new one
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="border rounded-lg p-6 bg-card">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary))',
                  },
                },
              },
            }}
            providers={[]}
          />
        </div>
      </div>
    </div>
  );
};

const getErrorMessage = (error: AuthError): string => {
  console.error("Authentication error:", error); // Debug log

  if (error instanceof AuthApiError) {
    switch (error.status) {
      case 400:
        if (error.message.includes("Invalid login credentials")) {
          return "Invalid email or password. Please check your credentials and try again.";
        }
        if (error.message.includes("Email not confirmed")) {
          return "Please verify your email address before signing in.";
        }
        return "Invalid login attempt. Please check your credentials and try again.";
      case 422:
        return "Invalid email format. Please enter a valid email address.";
      default:
        return error.message;
    }
  }
  
  return "An unexpected error occurred. Please try again.";
};