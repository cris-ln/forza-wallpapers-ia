import { address } from "@solana/kit";
import { findGaleriaPda } from "js-client";

import { config } from "./config.js";

export async function obtenerPdaGaleria() {
  const owner = address(config.owner);

  const [galeriaPda] = await findGaleriaPda({ owner });

  return galeriaPda;
}