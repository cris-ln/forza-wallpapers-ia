import { createSolanaRpc } from "@solana/kit";
import { config } from "./config.js";

// Conexión de lectura a Solana Devnet.
export const rpc = createSolanaRpc(config.rpcUrl);

console.log("Conexión RPC configurada:", config.rpcUrl);