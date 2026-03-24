import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
  showTestimonial?: boolean;
};

export function AuthLayout({ children, showTestimonial = true }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo: Branding (azul) */}
      <aside className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-secondary" />
            <h2 className="text-2xl font-bold text-white">AgendateYA</h2>
          </div>
          <p className="mt-3 text-lg text-primary-light">
            La forma más simple de gestionar citas y reservas para tu negocio.
          </p>
        </div>

        {showTestimonial && (
          <div className="mt-auto">
            <blockquote className="rounded-2xl bg-primary-light/20 p-6">
              <p className="text-base italic text-white">
                "AgendateYA transformó la forma en que gestionamos las citas en nuestra barbería. Ahora podemos
                enfocarnos en lo que realmente importa: nuestros clientes."
              </p>
              <footer className="mt-4">
                <p className="text-sm font-semibold text-white">Carlos Mendoza</p>
                <p className="text-xs text-primary-light">Dueño, Barbería Elite - Asunción</p>
              </footer>
            </blockquote>
          </div>
        )}

        <div className="mt-8">
          <p className="text-xs text-primary-light">© 2026 AgendateYA. Todos los derechos reservados.</p>
        </div>
      </aside>

      {/* Panel derecho: Formulario */}
      <main className="flex w-full flex-col bg-neutral lg:w-1/2">
        <div className="flex flex-1 items-center justify-center p-6 sm:p-8 md:p-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
