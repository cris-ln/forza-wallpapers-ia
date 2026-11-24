import { fetchGaleria } from "js-client";

import { rpc } from "./solana.js";
import { obtenerPdaGaleria } from "./pdas.js";

async function main() {
  console.log("Buscando la galería en Solana Devnet...");

  const galeriaPda = await obtenerPdaGaleria();

  console.log("PDA de la galería:", galeriaPda);

  const cuenta = await fetchGaleria(rpc, galeriaPda);

  console.log("\n¡Galería encontrada!");
  console.log("Nombre:", cuenta.data.nombreGaleria);
  console.log("Propietario:", cuenta.data.owner);
  console.log("Total de wallpapers:", cuenta.data.totalWallpapers);
}

main().catch((error) => {
  console.error("Error al consultar la galería:", error);
  process.exitCode = 1;
});