// El CSV oficial trae el nombre completo de cada candidatura en mayúsculas («PARTIDO POPULAR»).
// Se muestra con mayúsculas normales; las siglas entre paréntesis y los nombres de hasta 5
// letras (VOX, PAR, ALM…) se dejan como vienen.
const MENORES = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "en", "con", "para", "per", "dels", "les", "i", "a", "al", "por", "pel",
]);

export function nombreLegible(denominacion: string) {
  if (denominacion.length <= 5) return denominacion;
  return denominacion
    .split(/(\([^)]*\))/)
    .map((trozo, i) =>
      trozo.startsWith("(")
        ? trozo
        : trozo.replace(/\p{L}+/gu, (palabra, pos: number) => {
            const w = palabra.toLowerCase();
            return MENORES.has(w) && !(i === 0 && pos === 0) ? w : w.charAt(0).toUpperCase() + w.slice(1);
          }),
    )
    .join("");
}
