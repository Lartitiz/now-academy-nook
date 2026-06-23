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
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: normalizedEmail === ADMIN_EMAIL,
          emailRedirectTo: `${window.location.origin}/accueil`,
        },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
      return;
    }

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
            {sent ? (
              <div className="text-center space-y-3">
                <h2 className="font-display text-2xl text-[#91014B]">Lien envoyé ✨</h2>
                <p className="text-sm text-muted-foreground">
                  Regarde ta boîte mail ({email}) et clique sur le lien pour te connecter.
                </p>
                <button
                  type="button"
                  onClick={() => { setSent(false); setMode("signin"); }}
                  className="text-sm underline text-[#91014B]"
                >
                  Revenir
                </button>
              </div>
            ) : (
            <>
            <div className="flex gap-2 mb-5 p-1 bg-[#FFF4F8] rounded-full">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 text-sm py-2 rounded-full transition ${mode !== "magic" ? "bg-white text-[#91014B] shadow-sm" : "text-muted-foreground"}`}
              >
                Mot de passe
              </button>
              <button
                type="button"
                onClick={() => setMode("magic")}
                className={`flex-1 text-sm py-2 rounded-full transition ${mode === "magic" ? "bg-white text-[#91014B] shadow-sm" : "text-muted-foreground"}`}
              >
                Lien par email
              </button>
            </div>
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
                {mode !== "magic" && (
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
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FB3D80] hover:bg-[#91014B] text-white"
                >
                  {loading ? "…" : mode === "magic" ? "Recevoir le lien" : mode === "signup" ? "Créer mon compte" : "Me connecter"}
                </Button>
                {mode !== "magic" && (
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
                )}
            </form>
            </>
            )}
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
