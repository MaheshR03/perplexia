import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { usePDFs } from "@/hooks/usePDFs";
import { Link } from "@tanstack/react-router"; // Import Link

export function Profile() {
  const { user } = useAuth();
  const { sessions } = useChat();
  const { pdfs } = usePDFs();

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Username</p>
                <p>{user?.username || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p>{user?.email || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Total Chats</p>
                <p className="text-3xl font-bold">{sessions.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Documents</p>
                <p className="text-3xl font-bold">{pdfs.length}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Manage your documents in the{" "}
              <Link to="/pdfs" className="text-primary hover:underline">
                Document Manager
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
