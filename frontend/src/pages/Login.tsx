import { SignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Login() {
  return (
    <div className="container flex justify-center items-center h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col space-y-1">
          <CardTitle className="text-2xl text-center">Sign In</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SignIn forceRedirectUrl="/chat" />
          {/* Redirect to /chat after sign-in */}
        </CardContent>
      </Card>
    </div>
  );
}
