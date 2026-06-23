import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ADMIN_EMAIL = "laetitia@nowadaysagency.com";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      if (normalizedEmail !== ADMIN_EMAIL) {
        setLoading(false);
        toast.error("Cet espace est réservé. Demande à l'équipe de t'inviter.");
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/accueil` },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Compte créé. Tu es connecté·e.");
      navigate({ to: "/accueil" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error("Email ou mot de passe incorrect.");
      return;
    }
    navigate({ to: "/accueil" });
  };

  return (
    <div className="min-h-screen bg-[#FFF4F8] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-5xl text-[#91014B]">Now' Academy</h1>
            <p className="mt-3 text-muted-foreground">
              Ton espace formation. Réservé aux inscrit·es.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-[#FFD6E8] shadow-sm p-8">
            <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#91014B]">Ton email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="toi@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-[#FFD6E8] focus-visible:ring-[#FB3D80]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#91014B]">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-[#FFD6E8] focus-visible:ring-[#FB3D80]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FB3D80] hover:bg-[#91014B] text-white"
                >
                  {loading ? "…" : mode === "signup" ? "Créer mon compte" : "Me connecter"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {mode === "signin" ? (
                    <>
                      Première connexion ?{" "}
                      <button type="button" onClick={() => setMode("signup")} className="underline text-[#91014B]">
                        Créer un compte
                      </button>
                    </>
                  ) : (
                    <>
                      Déjà inscrit·e ?{" "}
                      <button type="button" onClick={() => setMode("signin")} className="underline text-[#91014B]">
                        Me connecter
                      </button>
                    </>
                  )}
                </p>
            </form>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Tu n'as pas accès ?{" "}
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="underline hover:text-[#FB3D80]"
            >
              Reviens à l'accueil
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
