"use client";

import { useState } from "react";
import provincias from "@/datos/provincias-2023.json";
import { DetalleProvincia } from "./DetalleProvincia";
import { SelectorTerritorio } from "./SelectorTerritorio";

// Resultados oficiales de 2023: solo se elige la provincia, no se cambian votos.
export function SelectorProvincia() {
  const [codigo, setCodigo] = useState("46");
  const provincia = provincias.find((p) => p.codigo === codigo) ?? provincias[0];

  return (
    <div className="[&>*+*]:mt-8">
      <SelectorTerritorio codigo={codigo} onChange={setCodigo} />
      <DetalleProvincia provincia={provincia} />
    </div>
  );
}
