import { login } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="p-7">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="size-8 rounded-[9px] bg-gradient-to-br from-primary to-[hsl(var(--primary)/0.55)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" />
            <span className="text-lg font-bold tracking-tight">Trinity&nbsp;Flows</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your dashboard.</p>

          {error && (
            <div className="mt-4 rounded-md bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <form action={login} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="admin@accotta.com" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" size="lg" className="mt-1 w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
