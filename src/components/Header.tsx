import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut } from "lucide-react";
import { toast } from "sonner";

export function Header({ isAdmin }: { isAdmin?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    setLeaving(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      await navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("La déconnexion a échoué. Réessaie.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-rose-doux bg-rose-pale/95 backdrop-blur">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/accueil" className="font-display text-xl tracking-tight text-rouge sm:text-2xl">
          Now' Academy<span className="text-framboise">.</span>
        </Link>
        <nav
          aria-label="Navigation principale"
          className="flex items-center gap-1 text-sm sm:gap-4"
        >
          <Link
            to="/accueil"
            className="hidden items-center gap-2 rounded-lg px-2 py-2 text-rouge hover:bg-rose-doux sm:inline-flex"
            activeProps={{ "aria-current": "page" }}
          >
            <BookOpen className="size-4" /> Ma formation
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-lg px-2 py-2 text-rouge hover:bg-rose-doux"
              activeProps={{ className: "bg-rose-doux", "aria-current": "page" }}
            >
              Admin
            </Link>
          )}
          {email && (
            <span
              title={email}
              className="hidden max-w-48 truncate text-muted-foreground xl:inline"
            >
              {email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            disabled={leaving}
            aria-label="Se déconnecter"
            className="text-rouge hover:bg-rose-doux"
          >
            <LogOut className="size-4" />
            <span className="hidden md:inline">{leaving ? "Déconnexion…" : "Se déconnecter"}</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
