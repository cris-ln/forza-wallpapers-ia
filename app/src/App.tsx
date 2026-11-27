import { useMemo } from "react";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";

import {
  WalletModalProvider,
} from "@solana/wallet-adapter-react-ui";

import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import { SOLANA_RPC } from "./solana/configuracion";

import "@solana/wallet-adapter-react-ui/styles.css";

import WallpapersPage from "./WallpapersPage";

export default function App() {
  const endpoint = SOLANA_RPC;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WallpapersPage />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}