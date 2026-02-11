import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import logoDark from "@/assets/buoyance_logo_dark.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Missing email",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmailSent(true);
      toast({
        title: "Email sent",
        description: "Check your inbox for the password reset link.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <Link to="/" className="inline-block mx-auto">
            <div className="bg-primary rounded-lg p-3 inline-block">
              <img src={logoDark} alt="BUOYANCE" className="h-8 w-auto" />
            </div>
          </Link>
          <div>
            <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
            <CardDescription>
              {emailSent
                ? "Check your email for a reset link"
                : "Enter your email to receive a password reset link"}
            </CardDescription>
          </div>
        </CardHeader>
        {!emailSent ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              <Link
                to="/signin"
                className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </CardFooter>
          </form>
        ) : (
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEmailSent(false)}
            >
              Try Again
            </Button>
            <Link
              to="/signin"
              className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
