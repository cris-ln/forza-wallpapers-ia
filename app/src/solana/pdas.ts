import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "CpvzJ6dcKsmfZMAnmhyx8vs3H8UjEbQnnzzPN1b7RDcC"
);

export function derivarPDAGaleria(owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("galeria"),
      owner.toBuffer(),
    ],
    PROGRAM_ID
  );
}

export function derivarPDAWallpaper(
  galeria: PublicKey,
  id: bigint
) {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(id);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("wallpaper"),
      galeria.toBuffer(),
      idBuffer,
    ],
    PROGRAM_ID
  );
}