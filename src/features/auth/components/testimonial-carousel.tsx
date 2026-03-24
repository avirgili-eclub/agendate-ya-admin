import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

type Testimonial = {
  id: number;
  quote: string;
  author: string;
  role: string;
  avatar: string;
};

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote:
      "AgendateYA transformó la forma en que gestionamos las citas en nuestra barbería. Ahora podemos enfocarnos en lo que realmente importa: nuestros clientes.",
    author: "Carlos Mendoza",
    role: "Dueño, Barbería Elite - Asunción",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos",
  },
  {
    id: 2,
    quote:
      "Desde que implementamos AgendateYA, redujimos un 70% las cancelaciones y nuestros clientes están mucho más satisfechos con la experiencia de reserva.",
    author: "María González",
    role: "Gerente, Spa Wellness",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
  },
  {
    id: 3,
    quote:
      "La automatización de recordatorios nos ahorró horas de trabajo semanal. Es increíble cómo una herramienta tan simple puede generar tanto impacto.",
    author: "Roberto Silva",
    role: "Director, Clínica Dental Sonrisa",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto",
  },
];

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const current = testimonials[currentIndex];

  return (
    <div className="w-full">
      <div className="rounded-2xl p-6 sm:p-8">
        {/* Icono de comillas */}
        <div className="mb-4 flex justify-left">
          <svg
            width="34"
            height="24"
            viewBox="0 0 34 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3.4 24L8 16C5.8 16 3.91667 15.2167 2.35 13.65C0.783333 12.0833 0 10.2 0 8C0 5.8 0.783333 3.91667 2.35 2.35C3.91667 0.783333 5.8 0 8 0C10.2 0 12.0833 0.783333 13.65 2.35C15.2167 3.91667 16 5.8 16 8C16 8.76667 15.9083 9.475 15.725 10.125C15.5417 10.775 15.2667 11.4 14.9 12L8 24H3.4ZM21.4 24L26 16C23.8 16 21.9167 15.2167 20.35 13.65C18.7833 12.0833 18 10.2 18 8C18 5.8 18.7833 3.91667 20.35 2.35C21.9167 0.783333 23.8 0 26 0C28.2 0 30.0833 0.783333 31.65 2.35C33.2167 3.91667 34 5.8 34 8C34 8.76667 33.9083 9.475 33.725 10.125C33.5417 10.775 33.2667 11.4 32.9 12L26 24H21.4Z"
              fill="#FF7544"
            />
          </svg>
        </div>

        {/* Reseña */}
        <blockquote>
          <p className="text-base italic leading-relaxed text-white sm:text-lg">
            "{current.quote}"
          </p>
        </blockquote>

        {/* Autor */}
        <div className="mt-6 flex items-center gap-3">
          <img
            src={current.avatar}
            alt={current.author}
            className="h-12 w-12 rounded-full bg-white/10"
            loading="lazy"
          />
          <div>
            <p className="text-sm font-semibold text-white">{current.author}</p>
            <p className="text-xs text-white/80">{current.role}</p>
          </div>
        </div>

        {/* Controles */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handlePrevious}
            className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-secondary"
            aria-label="Reseña anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={handleTogglePause}
            className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-secondary"
            aria-label={isPaused ? "Reanudar automático" : "Pausar automático"}
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-secondary"
            aria-label="Siguiente reseña"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Indicadores de posición */}
        <div className="mt-4 flex justify-center gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex ? "w-6 bg-secondary" : "bg-white/30"
              }`}
              aria-label={`Ir a reseña ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
