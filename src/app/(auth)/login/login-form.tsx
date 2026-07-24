"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("admin@gymflow.app");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await Promise.race([
        signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
          callbackUrl,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000)),
      ]);

      if (!res) {
        setError("Login timed out. Check Vercel env: AUTH_URL, DATABASE_URL, AUTH_SECRET.");
        return;
      }

      if (res.error) {
        setError("Invalid email or password. Use admin@gymflow.app / password123");
        return;
      }

      // Hard navigation so the session cookie is picked up reliably on Vercel
      window.location.href = callbackUrl.startsWith("/") ? callbackUrl : "/";
    } catch {
      setError("Login failed. Verify AUTH_URL is https://optimusv02.vercel.app on Vercel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-sky/20 shadow-xl shadow-primary/10">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky text-white shadow-lg shadow-primary/30">
            <Dumbbell className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl text-foreground">GymFlow</CardTitle>
          <CardDescription>Sign in to manage members, plans, and check-ins</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 rounded-xl border border-sky/20 bg-secondary/80 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Demo accounts</p>
            <p>admin@gymflow.app / password123 (ADMIN)</p>
            <p>staff@gymflow.app / password123 (STAFF)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
