
import {
  address,
  getAddressEncoder,
} from "@solana/kit";

import type { Base64EncodedBytes } from "@solana/rpc-types";

import {
  getWallpaperDecoder,
  getWallpaperDiscriminatorBytes,
} from "js-client/src/generated/accounts/wallpaper.js";

import { rpc } from "../solana.js";
import { obtenerPdaGaleria } from "../pdas.js";

function convertirBase64(bytes: ArrayLike<number>): Base64EncodedBytes {
  return Buffer.from(Array.from(bytes)).toString("base64") as Base64EncodedBytes;
}

const PROGRAM_ID = address(
  "CpvzJ6dcKsmfZMAnmhyx8vs3H8UjEbQnnzzPN1b7RDcC"
);

export async function obtenerWallpaperPorId(id: bigint) {
  console.log(`Buscando wallpaper con ID ${id}...`);

  const galeriaPda = await obtenerPdaGaleria();

  const galeriaBytes = getAddressEncoder().encode(galeriaPda);
  const discriminador = getWallpaperDiscriminatorBytes();

  const cuentas = await rpc.getProgramAccounts(PROGRAM_ID, {
    encoding: "base64",
    filters: [
      {
        memcmp: {
          offset: 0n,
          bytes: convertirBase64(discriminador),
          encoding: "base64",
        },
      },
      {
        memcmp: {
          offset: 40n,
          bytes: convertirBase64(galeriaBytes),
          encoding: "base64",
        },
      },
    ],
  }).send();

  const decodificador = getWallpaperDecoder();

  for (const cuenta of cuentas) {
    const datos = cuenta.account.data[0];

    const wallpaper = decodificador.decode(
      new Uint8Array(Buffer.from(datos, "base64"))
    );

    if (wallpaper.id === id) {
      return {
        cuenta: cuenta.pubkey,
        id: wallpaper.id,
        titulo: wallpaper.titulo,
        juego: wallpaper.juego,
        urlImagen: wallpaper.urlImagen,
        precioLamports: wallpaper.precioLamports,
        descargas: wallpaper.descargas,
      };
    }
  }

  return null;
}