
import { Program, AnchorProvider, BorshAccountsCoder } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  crearInstruccionReconocimiento,
  obtenerReconocimiento,
} from "./solana/reconocimientos";

import { URI_RECONOCIMIENTOS } from "./solana/configuracion";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fromWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import {
  dasApi,
} from "@metaplex-foundation/digital-asset-standard-api";
import type {
  DasApiInterface,
} from "@metaplex-foundation/digital-asset-standard-api";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { Buffer } from "buffer";
import IDL from "./idl/forza_wallpapers.json";

// Dirección del programa en Devnet
export const PROGRAM_ID = new PublicKey(
  "CpvzJ6dcKsmfZMAnmhyx8vs3H8UjEbQnnzzPN1b7RDcC"
);

export const DEVNET_RPC = "https://api.devnet.solana.com";

// Estructura de una galería
export interface GaleriaData {
  publicKey: PublicKey;
  owner: PublicKey;
  nombreGaleria: string;
  totalWallpapers: number;
}

// Estructura de un wallpaper
export interface WallpaperCatalogo {
  publicKey: PublicKey;
  id: number;
  titulo: string;
  juego: string;
  urlImagen: string;
  precioLamports: BN;
  descargas: number;
}

// Conectar con el programa
export function obtenerPrograma(
  connection: Connection,
  wallet: AnchorWallet
) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  return new Program(IDL as Idl, provider);
}

// Calcular PDA de la galería
export async function calcularPdaGaleria(owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("galeria"), owner.toBuffer()],
    PROGRAM_ID
  );
}

// Calcular PDA del wallpaper
export async function calcularPdaWallpaper(
  galeria: PublicKey,
  id: number
) {
  const idBytes = new BN(id).toArrayLike(Buffer, "le", 8);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("wallpaper"),
      galeria.toBuffer(),
      idBytes,
    ],
    PROGRAM_ID
  );
}

// Convertir SOL a lamports
export function solALamports(sol: string): BN {
  if (!/^\d+(\.\d{1,9})?$/.test(sol.trim())) {
    throw new Error("Introduce un precio válido en SOL.");
  }

  const [entero, decimal = ""] = sol.trim().split(".");
  const lamports =
    BigInt(entero) * 1_000_000_000n +
    BigInt(decimal.padEnd(9, "0"));

  return new BN(lamports.toString());
}

// Convertir lamports a SOL
export function lamportsASol(lamports: BN | number | string): string {
  const valor = new BN(lamports.toString());
  const entero = valor.div(new BN("1000000000"));
  const decimal = valor.mod(new BN("1000000000"));

  return `${entero.toString()}.${decimal.toString().padStart(9, "0")}`;
}

// Crear galería
export async function crearGaleria(
  connection: Connection,
  wallet: AnchorWallet,
  nombre: string
): Promise<string> {
  if (Buffer.byteLength(nombre, "utf8") > 30 || !nombre.trim()) {
    throw new Error("El nombre debe tener entre 1 y 30 bytes.");
  }

  const programa = obtenerPrograma(connection, wallet);
  const [galeria] = await calcularPdaGaleria(wallet.publicKey);

  const tx = await (programa.methods as any)
    .crearGaleria(nombre.trim())
    .accounts({
      galeria,
      owner: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return `Galería creada correctamente. Transacción: ${tx}`;
}

// Publicar wallpaper y emitir reconocimiento cNFT cuando corresponda
export async function publicarWallpaper(
  connection: Connection,
  wallet: AnchorWallet,
  titulo: string,
  juego: string,
  urlImagen: string,
  precio: BN,
  direccionColeccion?: string
): Promise<string> {
  if (Buffer.byteLength(titulo, "utf8") > 30 || !titulo.trim()) {
    throw new Error("El título debe tener entre 1 y 30 bytes.");
  }

  if (Buffer.byteLength(juego, "utf8") > 20 || !juego.trim()) {
    throw new Error("El nombre del juego debe tener entre 1 y 20 bytes.");
  }

  if (Buffer.byteLength(urlImagen, "utf8") > 80 || !urlImagen.trim()) {
    throw new Error("La URL debe tener entre 1 y 80 bytes.");
  }

  const programa = obtenerPrograma(connection, wallet);
  const [galeria] = await calcularPdaGaleria(wallet.publicKey);

  const cuentaGaleria: any = await (programa.account as any)
    .galeria.fetch(galeria);

  const id = Number(cuentaGaleria.totalWallpapers.toString());
  const siguientePublicacion = id + 1;

  const [wallpaper] = await calcularPdaWallpaper(galeria, id);

  const instruccionPublicacion = await (programa.methods as any)
    .publicarWallpaper(
      titulo.trim(),
      juego.trim(),
      urlImagen.trim(),
      precio
    )
    .accounts({
      galeria,
      wallpaper,
      owner: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const instrucciones = [instruccionPublicacion];

  const reconocimiento = obtenerReconocimiento(siguientePublicacion);

  if (reconocimiento) {
    if (!direccionColeccion) {
      throw new Error(
        "Primero debes crear la colección de reconocimientos antes de alcanzar este hito."
      );
    }

    const uriMetadata =
      URI_RECONOCIMIENTOS[reconocimiento.publicaciones];

    const instruccionReconocimiento =
      await crearInstruccionReconocimiento(
        connection,
        wallet,
        new PublicKey(direccionColeccion),
        siguientePublicacion,
        uriMetadata
      );

    instrucciones.push(instruccionReconocimiento);
  }

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: wallet.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  }).add(...instrucciones);

  const signedTransaction = await wallet.signTransaction(transaction);

  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize()
  );

  const confirmacion = await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );

  if (confirmacion.value.err) {
    throw new Error(
      `La publicación del wallpaper o su reconocimiento falló: ${JSON.stringify(confirmacion.value.err)}`
    );
  }

  const mensajeReconocimiento = reconocimiento
    ? ` También se emitió el reconocimiento "${reconocimiento.nombre}".`
    : "";

  return `Wallpaper publicado correctamente.${mensajeReconocimiento} Transacción: ${signature}`;
}

// Actualizar precio
export async function actualizarPrecio(
  connection: Connection,
  wallet: AnchorWallet,
  id: number,
  nuevoPrecio: BN
): Promise<string> {
  const programa = obtenerPrograma(connection, wallet);
  const [galeria] = await calcularPdaGaleria(wallet.publicKey);
  const [wallpaper] = await calcularPdaWallpaper(galeria, id);

  const tx = await (programa.methods as any)
    .actualizarPrecio(nuevoPrecio)
    .accounts({
      wallpaper,
      owner: wallet.publicKey,
    })
    .rpc();

  return `Precio actualizado. Transacción: ${tx}`;
}

// Eliminar wallpaper
export async function eliminarWallpaper(
  connection: Connection,
  wallet: AnchorWallet,
  id: number
): Promise<string> {
  const programa = obtenerPrograma(connection, wallet);
  const [galeria] = await calcularPdaGaleria(wallet.publicKey);
  const [wallpaper] = await calcularPdaWallpaper(galeria, id);

  const tx = await (programa.methods as any)
    .eliminarWallpaper()
    .accounts({
      wallpaper,
      owner: wallet.publicKey,
    })
    .rpc();

  return `Wallpaper eliminado. Transacción: ${tx}`;
}

// Consultar galería
export async function obtenerGaleria(
  connection: Connection,
  owner: PublicKey
): Promise<GaleriaData | null> {
  const [direccion] = await calcularPdaGaleria(owner);
  const info = await connection.getAccountInfo(direccion);

  if (!info) return null;

  const coder = new BorshAccountsCoder(IDL as Idl);
  const datos: any = coder.decode("Galeria", info.data);

  return {
    publicKey: direccion,
    owner: datos.owner,
    nombreGaleria: datos.nombreGaleria ?? datos.nombre_galeria,
    totalWallpapers: Number(
      datos.totalWallpapers ?? datos.total_wallpapers
    ),
  };
}

// Consultar wallpapers de una galería
export async function obtenerWallpapers(
  connection: Connection,
  galeria: PublicKey
): Promise<WallpaperCatalogo[]> {
  const infoGaleria = await connection.getAccountInfo(galeria);

  if (!infoGaleria) return [];

  const coder = new BorshAccountsCoder(IDL as Idl);
  const datosGaleria: any = coder.decode("Galeria", infoGaleria.data);

  const total = Number(
    datosGaleria.totalWallpapers ?? datosGaleria.total_wallpapers
  );

  const resultados: WallpaperCatalogo[] = [];

  for (let inicio = 0; inicio < total; inicio += 20) {
    const ids = Array.from(
      { length: Math.min(20, total - inicio) },
      (_, i) => inicio + i
    );

    const direcciones = await Promise.all(
      ids.map(async (id) => {
        const [pda] = await calcularPdaWallpaper(galeria, id);
        return pda;
      })
    );

    const cuentas = await connection.getMultipleAccountsInfo(direcciones);

    cuentas.forEach((cuenta, indice) => {
      if (!cuenta || !cuenta.owner.equals(PROGRAM_ID)) return;

      try {
        const datos: any = coder.decode("Wallpaper", cuenta.data);

        const owner = datos.owner;
        const galeriaCuenta = datos.galeria;

        if (
          !galeriaCuenta?.equals(galeria) ||
          !owner?.equals(datosGaleria.owner)
        ) return;

        const id = Number((datos.id ?? ids[indice]).toString());

        resultados.push({
          publicKey: direcciones[indice],
          id,
          titulo: datos.titulo,
          juego: datos.juego,
          urlImagen: datos.urlImagen ?? datos.url_imagen,
          precioLamports: new BN(
            (datos.precioLamports ?? datos.precio_lamports).toString()
          ),
          descargas: Number(datos.descargas.toString()),
        });
      } catch {
        // Omitir cuentas que no puedan decodificarse.
      }
    });
  }

  return resultados;
}

// Obtener mensajes de error
export function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

/**
 * Reclama un reconocimiento ya alcanzado sin publicar otro wallpaper
 * ni modificar el contador de la galería.
 */
export async function reclamarReconocimiento(
  connection: Connection,
  wallet: AnchorWallet,
  direccionColeccion: string,
  publicaciones: number
): Promise<string> {
  const reconocimiento = obtenerReconocimiento(publicaciones);

  if (!reconocimiento) {
    throw new Error("No existe un reconocimiento configurado para este hito.");
  }

  const uriMetadata = URI_RECONOCIMIENTOS[publicaciones as keyof typeof URI_RECONOCIMIENTOS];

  if (!uriMetadata) {
    throw new Error("No se encontró el metadata del reconocimiento.");
  }

  const claveLocal =
    `forza-wallpapers-reconocimiento-${publicaciones}-` +
    wallet.publicKey.toBase58();

  if (localStorage.getItem(claveLocal)) {
    throw new Error(
      "Este reconocimiento ya fue reclamado desde este navegador. " +
      "No vuelvas a emitirlo."
    );
  }

  // Consultar DAS antes de emitir para evitar duplicados.
  const umiDAS = createUmi(connection).use(
    dasApi({ heliusCompatibility: true })
  );

  let activosDAS;

  try {
    const rpcDAS = umiDAS.rpc as typeof umiDAS.rpc & DasApiInterface;

    activosDAS = await rpcDAS.getAssetsByOwner({
      owner: fromWeb3JsPublicKey(wallet.publicKey),
      limit: 1000,
    });
  } catch (error) {
    throw new Error(
      "No fue posible consultar DAS para comprobar si el reconocimiento " +
      "ya existe. No se emitió ningún NFT. Detalle: " +
      (error instanceof Error ? error.message : String(error))
    );
  }

  const yaExiste = activosDAS.items.some((asset) =>
    asset.grouping.some(
      (grupo) =>
        grupo.group_key === "collection" &&
        grupo.group_value === direccionColeccion
    ) &&
    asset.content.metadata.name === reconocimiento.nombre
  );

  if (yaExiste) {
    localStorage.setItem(claveLocal, "verificado");
    throw new Error(
      "DAS ya encontró este reconocimiento en tu wallet. No se emitió otro."
    );
  }

  const instruccion = await crearInstruccionReconocimiento(
    connection,
    wallet,
    new PublicKey(direccionColeccion),
    publicaciones,
    uriMetadata
  );

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: wallet.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  }).add(instruccion);

  // Simulación previa: todavía no se solicita la firma de Phantom.
  const simulacion = await connection.simulateTransaction(transaction);

  if (simulacion.value.err) {
    throw new Error(
      "La simulación del reconocimiento falló. No se envió la transacción. " +
      JSON.stringify(simulacion.value.err) +
      (simulacion.value.logs
        ? "\n" + simulacion.value.logs.join("\n")
        : "")
    );
  }

  console.log("Simulación del reconocimiento correcta.");

  const signedTransaction = await wallet.signTransaction(transaction);

  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize()
  );

  const confirmacion = await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );

  if (confirmacion.value.err) {
    throw new Error(
      "La transacción fue enviada, pero la confirmación reportó un error: " +
      JSON.stringify(confirmacion.value.err) +
      ". Firma: " + signature
    );
  }

  // Evita un segundo reclamo mientras DAS termina de indexar el cNFT.
  localStorage.setItem(claveLocal, signature);

  return (
    `Reconocimiento "${reconocimiento.nombre}" emitido correctamente. ` +
    `Transacción: ${signature}`
  );
}
