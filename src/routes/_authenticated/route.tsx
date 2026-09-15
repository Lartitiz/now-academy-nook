import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: error ? null : data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  // Redirect after hydration: redirecting from a browser-only beforeLoad replaces
  // the server match tree before React can hydrate a direct lesson URL.
  if (!user) return <Navigate to="/auth" replace />;
  return <Outlet />;
}
