import { Header } from "./Header";
import { BookOpen } from "lucide-react";
import { Button } from "./ui/button";
export function AccessDenied() {
  return (
    <div className="min-h-screen bg-rose-pale">
      <Header />
      <main id="contenu" className="mx-auto max-w-lg px-5 py-16">
        <div className="rounded-3xl border border-rose-doux bg-white p-8 text-center">
          <BookOpen className="mx-auto mb-5 size-8 text-rouge" />
          <h1 className="font-display text-3xl text-rouge">Ton accès à la formation</h1>
          <p className="mt-4 leading-relaxed">
            Cet espace est réservé aux membres de la Now’ Academy. Si tu es déjà inscrit·e, vérifie
            que tu utilises l’email de ton inscription.
          </p>
          <Button asChild className="mt-6 bg-rouge text-white hover:bg-rouge/90">
            <a href="mailto:laetitia@nowadaysagency.com">Contacter Laetitia</a>
          </Button>
        </div>
      </main>
    </div>
  );
}
