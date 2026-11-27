import {
  createCollection,
  mplCore,
} from "@metaplex-foundation/mpl-core";

import { mintV2, mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";

import {
  createNoopSigner,
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import {
  fromWeb3JsKeypair,
  fromWeb3JsPublicKey,
  toWeb3JsInstruction,
} from "@metaplex-foundation/umi-web3js-adapters";

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";

import type { AnchorWallet } from "@solana/wallet-adapter-react";

import {
  MERKLE_TREE,
  NOMBRE_COLECCION,
  RECONOCIMIENTOS,
  SIMBOLO_RECONOCIMIENTOS,
} from "./configuracion";

/**
 * Crea la colección Core que agrupará los reconocimientos cNFT.
 *
 * La wallet conectada será la autoridad de actualización
 * y autoridad del plugin BubblegumV2.
 *
 * Esta función requiere una URI pública para los metadatos
 * JSON de la colección.
 */
export async function crearColeccionReconocimientos(
  connection: Connection,
  wallet: AnchorWallet,
  uri: string,
) {
  if (!uri.trim()) {
    throw new Error("La URI de metadatos de la colección es obligatoria.");
  }

  const umi = createUmi(connection)
    .use(mplCore())
    .use(mplBubblegum());

  const walletSigner = createNoopSigner(
    fromWeb3JsPublicKey(wallet.publicKey),
  );

  umi.use(signerIdentity(walletSigner));

  const collectionKeypair = Keypair.generate();

  const collectionSigner = createSignerFromKeypair(
    umi,
    fromWeb3JsKeypair(collectionKeypair),
  );

  const builder = createCollection(umi, {
    collection: collectionSigner,
    name: NOMBRE_COLECCION,
    uri,
    plugins: [
      {
        type: "BubblegumV2",
      },
    ],
  });

  const instrucciones = builder
    .getInstructions()
    .map(toWeb3JsInstruction);

  const latestBlockhash = await connection.getLatestBlockhash(
    "confirmed",
  );

  const transaction = new Transaction({
    feePayer: wallet.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  }).add(...instrucciones);

  transaction.partialSign(collectionKeypair);

  console.log("Simulando creación de colección Core...");

  const simulacion = await connection.simulateTransaction(transaction);

  if (simulacion.value.err) {
    console.error("Error de simulación:", simulacion.value.err);
    console.error("Logs de Solana:", simulacion.value.logs);

    throw new Error(
      `Falló la simulación de la colección: ${JSON.stringify(simulacion.value.err)}. Logs: ${(simulacion.value.logs ?? []).join(" | ")}`
    );
  }

  console.log("Simulación correcta:", simulacion.value.logs);

  const signedTransaction = await wallet.signTransaction(transaction);

  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize(),
  );

  const confirmacion = await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );

  if (confirmacion.value.err) {
    throw new Error(
      `La creación de la colección falló: ${JSON.stringify(confirmacion.value.err)}`
    );
  }

  return {
    collection: collectionKeypair.publicKey,
    signature,
  };
}

/**
 * Devuelve el reconocimiento correspondiente al número
 * acumulado de publicaciones.
 */
export function obtenerReconocimiento(publicaciones: number) {
  return RECONOCIMIENTOS.find(
    (reconocimiento) =>
      reconocimiento.publicaciones === publicaciones,
  );
}

/**
 * Construye la instrucción Bubblegum V2 para emitir
 * un reconocimiento cNFT asociado a nuestra colección Core.
 *
 * No envía la transacción: permite combinar esta instrucción
 * con la publicación Anchor en una sola transacción.
 */
export async function crearInstruccionReconocimiento(
  connection: Connection,
  wallet: AnchorWallet,
  direccionColeccion: PublicKey,
  publicaciones: number,
  uriMetadata: string,
) {
  const reconocimiento = obtenerReconocimiento(publicaciones);

  if (!reconocimiento) {
    throw new Error(
      `No existe un reconocimiento para ${publicaciones} publicaciones.`,
    );
  }

  if (!uriMetadata.trim()) {
    throw new Error("La URI de metadatos del reconocimiento es obligatoria.");
  }

  const umi = createUmi(connection)
    .use(mplCore())
    .use(mplBubblegum());

  const walletSigner = createNoopSigner(
    fromWeb3JsPublicKey(wallet.publicKey),
  );

  umi.use(signerIdentity(walletSigner));

  const collection = fromWeb3JsPublicKey(direccionColeccion);

  const builder = mintV2(umi, {
    payer: walletSigner,
    collectionAuthority: walletSigner,
    leafOwner: walletSigner.publicKey,
    merkleTree: fromWeb3JsPublicKey(MERKLE_TREE),
    coreCollection: collection,
    metadata: {
      name: reconocimiento.nombre,
      symbol: SIMBOLO_RECONOCIMIENTOS,
      uri: uriMetadata,
      sellerFeeBasisPoints: 0,
      primarySaleHappened: false,
      isMutable: false,
      creators: [
        {
          address: walletSigner.publicKey,
          verified: false,
          share: 100,
        },
      ],
      collection,
    },
  });

  const instrucciones = builder
    .getInstructions()
    .map(toWeb3JsInstruction);

  if (instrucciones.length !== 1) {
    throw new Error(
      `Se esperaba una instrucción Bubblegum V2 y se obtuvieron ${instrucciones.length}.`,
    );
  }

  return instrucciones[0];
}
