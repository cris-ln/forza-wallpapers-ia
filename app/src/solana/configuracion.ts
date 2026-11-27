import { PublicKey } from "@solana/web3.js";

export const SOLANA_CLUSTER = "devnet";

export const SOLANA_RPC =
  import.meta.env.VITE_SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

const BASE_METADATA =
  "https://raw.githubusercontent.com/cris-ln/forza-wallpapers-workshop3-metadata/main/workshop4/reconocimientos";

export const URI_COLECCION =
  `${BASE_METADATA}/coleccion.json`;

export const URI_RECONOCIMIENTOS = {
  1: `${BASE_METADATA}/primer-wallpaper.json`,
  3: `${BASE_METADATA}/piloto-destacado.json`,
  5: `${BASE_METADATA}/coleccionista-racing.json`,
} as const;

export const MERKLE_TREE = new PublicKey(
  "2RzjUxtcDad5M7PeBKAnK5CxKn1myjSKTPWTHJJetEta"
);

export const MERKLE_TREE_CONFIG = new PublicKey(
  "HGF7mwU7CvVZTcK95t87j6VR9uTEa6h8z5nRwdQgB643"
);

export const RECONOCIMIENTOS = [
  { publicaciones: 1, nombre: "Primer Wallpaper" },
  { publicaciones: 3, nombre: "Piloto Destacado" },
  { publicaciones: 5, nombre: "Coleccionista de Racing" },
] as const;

export const NOMBRE_COLECCION =
  "Forza Wallpapers - Reconocimientos";

export const SIMBOLO_RECONOCIMIENTOS = "FWREWARD";
