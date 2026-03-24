import type { ReactNode } from "react";
import { TestimonialCarousel } from "./testimonial-carousel";

type AuthLayoutProps = {
  children: ReactNode;
  showTestimonial?: boolean;
};

export function AuthLayout({ children, showTestimonial = true }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo: Branding (azul) */}
      <aside className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:p-12 lg:relative">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-secondary" />
            <h2 className="text-2xl font-bold text-white">AgendateYA</h2>
          </div>
          <p className="mt-3 text-lg text-white/90">
            La forma más simple de gestionar citas y reservas para tu negocio.
          </p>
        </div>

        {showTestimonial && (
          <div className="flex flex-1 items-center">
            <TestimonialCarousel />
          </div>
        )}

        <div className="mt-auto">
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
