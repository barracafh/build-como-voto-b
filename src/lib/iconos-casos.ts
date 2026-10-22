import {
  Accessibility,
  Globe,
  IdCard,
  Mail,
  Plane,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { Caso } from "@/datos/como-votar";

// Iconos y rutas de los casos, compartidos por la portada, el índice de la
// guía y las páginas de caso.

export type IconoCaso = Caso["icono"];

export const iconosCaso: Record<IconoCaso, LucideIcon> = {
  urna: Vote,
  correo: Mail,
  mundo: Globe,
  maleta: Plane,
  braille: Accessibility,
  sobre: IdCard,
};

export const rutaCaso = (id: Caso["id"]) => `/como-votar/${id}`;
