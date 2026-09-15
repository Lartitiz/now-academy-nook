import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, BookOpen, Check, Eye, EyeOff, LoaderCircle, Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<"magic" | "signup" | null>(null);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setError("");
    setShowPassword(false);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/accueil` },
        });
        if (error) throw error;
        setSent("magic");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/accueil` },
        });
        if (error) throw error;
        // When confirmation is required, there is no session yet.
        if (!data.session) setSent("signup");
        else await navigate({ to: "/accueil" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        await navigate({ to: "/accueil" });
      }
    } catch (failure) {
      const code = failure && typeof failure === "object" && "code" in failure ? failure.code : "";
      setError(
        code === "invalid_credentials"
          ? "L’email ou le mot de passe est incorrect. Tu peux aussi recevoir un lien par email."
          : code === "email_not_confirmed"
            ? "Confirme d’abord ton adresse via le lien reçu par email."
            : code === "over_email_send_rate_limit" || code === "over_request_rate_limit"
              ? "Trop de tentatives rapprochées. Patiente quelques minutes avant de réessayer."
              : "La connexion n’a pas abouti. Vérifie ta connexion internet, puis réessaie.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-pale">
      <header className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <Link to="/" className="font-display text-2xl text-rouge">
          Now' Academy<span className="text-framboise">.</span>
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-6 sm:px-8 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20">
        <section>
          <p className="eyebrow">BIENVENUE DANS TON ESPACE</p>
          <h1 className="mt-5 font-display text-4xl leading-tight text-rouge sm:text-5xl lg:text-6xl">
            Du temps pour
            <br />
            apprendre.
            <br />
            <span className="italic">Et pour toi.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            Tes leçons, tes ressources et tes avancées, au même endroit. On reprend quand tu veux.
          </p>
          <div className="mt-8 hidden max-w-sm items-start gap-3 border-t border-rose-doux pt-6 text-sm text-rouge lg:flex">
            <BookOpen className="size-5 shrink-0" />
            <p>
              Un module après l’autre, à ton rythme.
              <br />
              <span className="text-muted-foreground">Tu peux revenir sur chaque leçon.</span>
            </p>
          </div>
        </section>
        <section
          aria-labelledby="connexion-title"
          className="rounded-3xl border border-rose-doux bg-white p-6 shadow-[0_12px_48px_-28px_#91014B44] sm:p-8"
        >
          {sent ? (
            <div role="status" className="py-5 text-center">
              <Mail className="mx-auto mb-5 size-9 text-rouge" />
              <h2 id="connexion-title" className="font-display text-2xl text-rouge">
                {sent === "signup" ? "Confirme ton email" : "Regarde ta boîte mail"}
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {sent === "signup"
                  ? "Si ton adresse peut être inscrite, tu recevras un lien pour confirmer ton compte."
                  : "Si ton adresse est reconnue, un lien de connexion vient de t’être envoyé."}
              </p>
              <p className="mt-3 break-all font-medium text-rouge">{email.trim().toLowerCase()}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                Pense à vérifier tes courriers indésirables.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSent(null);
                  setError("");
                }}
                className="mt-6 border-rose-doux text-rouge"
              >
                Modifier mon email
              </Button>
            </div>
          ) : (
            <>
              <h2 id="connexion-title" className="font-display text-2xl text-rouge">
                {mode === "signup" ? "Ta première connexion" : "Ravie de te retrouver"}
              </h2>
              <p className="mb-6 mt-2 text-sm text-muted-foreground">
                Utilise l’adresse email de ton inscription.
              </p>
              <div
                role="group"
                aria-label="Méthode de connexion"
                className="mb-6 flex gap-1 rounded-xl bg-rose-pale p-1"
              >
                {(
                  [
                    { value: "signin", label: "Mot de passe" },
                    { value: "magic", label: "Lien par email" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    disabled={loading}
                    aria-pressed={item.value === "magic" ? mode === "magic" : mode !== "magic"}
                    onClick={() => changeMode(item.value)}
                    className={`min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition ${item.value === "magic" ? (mode === "magic" ? "bg-white text-rouge shadow-sm" : "text-muted-foreground") : mode !== "magic" ? "bg-white text-rouge shadow-sm" : "text-muted-foreground"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <form onSubmit={onSubmit} className="space-y-5" aria-busy={loading}>
                <div className="space-y-2">
                  <Label htmlFor="email">Ton email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="toi@exemple.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                    className="h-12 border-rose-doux"
                  />
                </div>
                {mode !== "magic" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={mode === "signup" ? 8 : undefined}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        placeholder={
                          mode === "signup" ? "Au moins 8 caractères" : "Ton mot de passe"
                        }
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading}
                        className="h-12 border-rose-doux pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                          showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                        }
                        className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-rouge"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {mode === "signin" && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => changeMode("magic")}
                        className="text-sm text-rouge underline underline-offset-4"
                      >
                        Mot de passe oublié ? Recevoir un lien
                      </button>
                    )}
                  </div>
                )}
                {mode === "magic" && (
                  <p className="rounded-xl bg-rose-pale p-3 text-sm leading-relaxed text-rouge">
                    Tu recevras un lien pour te connecter directement, sans mot de passe.
                  </p>
                )}
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-doux bg-rose-pale p-3 text-sm text-rouge"
                  >
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full bg-rouge text-white hover:bg-rouge/90"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Connexion en cours…
                    </>
                  ) : (
                    <>
                      {mode === "magic"
                        ? "Recevoir mon lien"
                        : mode === "signup"
                          ? "Créer mon compte"
                          : "Me connecter"}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
                {mode !== "magic" && (
                  <p className="text-center text-sm text-muted-foreground">
                    {mode === "signin" ? "Première connexion ? " : "Déjà un compte ? "}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}
                      className="text-rouge underline underline-offset-4"
                    >
                      {mode === "signin" ? "Créer mon compte" : "Me connecter"}
                    </button>
                  </p>
                )}
              </form>
            </>
          )}
          <div className="mt-7 border-t border-rose-doux pt-5 text-center text-sm text-muted-foreground">
            Besoin d’un coup de main ?{" "}
            <a
              href="mailto:laetitia@nowadaysagency.com"
              className="text-rouge underline underline-offset-4"
            >
              Écris-moi
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
