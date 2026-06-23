import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/accueil`,
        shouldCreateUser: false,
      },
    });
    setLoading(false);
    if (error) {
      // Show same message either way to avoid email enumeration
      toast.error("Si tu es inscrit·e, tu vas recevoir un lien sous peu.");
      setSent(true);
      return;
    }
    setSent(true);
    toast.success("Vérifie ta boîte mail — ton lien de connexion arrive.");
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
              <div className="text-center space-y-4">
                <div className="inline-block px-4 py-2 rounded-full bg-[#FFE561] text-[#91014B] text-sm font-medium">
                  Lien envoyé
                </div>
                <p className="text-sm text-foreground">
                  On vient de t'envoyer un email avec un lien de connexion. Clique dessus pour entrer dans ton espace.
                </p>
                <p className="text-xs text-muted-foreground">
                  Pense à vérifier tes spams. Tu ne reçois rien ? Cet espace est réservé aux inscrit·es de la Now' Academy.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                  className="text-[#91014B]"
                >
                  Essayer une autre adresse
                </Button>
              </div>
            ) : (
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
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FB3D80] hover:bg-[#91014B] text-white"
                >
                  {loading ? "Envoi…" : "Recevoir mon lien de connexion"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Pas de mot de passe. On t'envoie un lien magique à chaque connexion.
                </p>
              </form>
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
