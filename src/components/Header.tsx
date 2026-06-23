import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function Header({ isAdmin }: { isAdmin?: boolean }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="border-b border-[#FFD6E8]/60 bg-[#FFF4F8]/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/accueil" className="font-display text-2xl text-[#91014B] tracking-tight">
          Now' Academy
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {isAdmin && (
            <Link
              to="/admin"
              className="text-[#91014B] hover:text-[#FB3D80] transition"
              activeProps={{ className: "text-[#FB3D80]" }}
            >
              Espace admin
            </Link>
          )}
          {email && <span className="text-muted-foreground hidden sm:inline">{email}</span>}
          <Button variant="ghost" size="sm" onClick={signOut} className="text-[#91014B] hover:bg-[#FFD6E8]">
            Se déconnecter
          </Button>
        </nav>
      </div>
    </header>
  );
}
