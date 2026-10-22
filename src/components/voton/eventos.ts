// Cualquier parte de la página puede abrir el chat de Votón, con o sin una
// pregunta ya escrita en el campo, sin depender de dónde está montado.
export const ABRIR_CHAT = "voton:abrir-chat";

export type AbrirChat = { pregunta?: string };

export function abrirChat(detalle: AbrirChat = {}) {
  window.dispatchEvent(new CustomEvent<AbrirChat>(ABRIR_CHAT, { detail: detalle }));
}
