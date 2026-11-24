
import { Program, AnchorProvider, BorshAccountsCoder } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
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

// Publicar wallpaper
export async function publicarWallpaper(
  connection: Connection,
  wallet: AnchorWallet,
  titulo: string,
  juego: string,
  urlImagen: string,
  precio: BN
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

  const [wallpaper] = await calcularPdaWallpaper(galeria, id);

  const tx = await (programa.methods as any)
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
    .rpc();

  return `Wallpaper publicado correctamente. Transacción: ${tx}`;
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