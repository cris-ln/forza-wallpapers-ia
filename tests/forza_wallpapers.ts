
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { ForzaWallpapers } from "../target/types/forza_wallpapers";

describe("forza_wallpapers", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .forzaWallpapers as Program<ForzaWallpapers>;

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const owner = provider.wallet.publicKey;

  const [galeriaPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("galeria"), owner.toBuffer()],
    program.programId
  );

  const obtenerWallpaperPda = (id: number) => {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("wallpaper"),
        galeriaPda.toBuffer(),
        new anchor.BN(id).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    )[0];
  };

  it("Comprueba el flujo completo de Forza Wallpapers", async () => {
    // 1. Crear galería
    await program.methods
  .crearGaleria("Forza Test")
  .accounts({
    owner,
  })
  .rpc();

    const galeria = await program.account.galeria.fetch(galeriaPda);

    expect(galeria.nombreGaleria).to.equal("Forza Test");
    expect(galeria.totalWallpapers.toNumber()).to.equal(0);

    // 2. Rechazar publicación con título vacío
    let rechazado = false;

    try {
      await program.methods
        .publicarWallpaper(
          "",
          "Forza Horizon 5",
          "https://www.instagram.com/p/Df2rInHGwMn/",
          new anchor.BN(1000000000)
        )
        .accounts({
          galeria: galeriaPda,
          wallpaper: obtenerWallpaperPda(0),
          owner,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch {
      rechazado = true;
    }

    expect(rechazado).to.equal(true);

    // 3. Rechazar URL demasiado larga
    rechazado = false;

    try {
      await program.methods
        .publicarWallpaper(
          "Supra",
          "Forza Horizon 5",
          "x".repeat(81),
          new anchor.BN(1000000000)
        )
        .accounts({
          galeria: galeriaPda,
          wallpaper: obtenerWallpaperPda(0),
          owner,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch {
      rechazado = true;
    }

    expect(rechazado).to.equal(true);

    // 4. Publicar wallpaper válido
    const wallpaperPda = obtenerWallpaperPda(0);

    await program.methods
      .publicarWallpaper(
        "Toyota Supra",
        "Forza Horizon 5",
        "https://www.instagram.com/p/Df2rInHGwMn/",
        new anchor.BN(1000000000)
      )
      .accounts({
        galeria: galeriaPda,
        wallpaper: wallpaperPda,
        owner,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const wallpaper = await program.account.wallpaper.fetch(wallpaperPda);

    expect(wallpaper.titulo).to.equal("Toyota Supra");
    expect(wallpaper.id.toNumber()).to.equal(0);
    expect(wallpaper.precioLamports.toNumber()).to.equal(1000000000);

    // 5. Actualizar precio
    await program.methods
      .actualizarPrecio(new anchor.BN(2000000000))
      .accounts({
        galeria: galeriaPda,
        wallpaper: wallpaperPda,
        owner,
      })
      .rpc();

    const wallpaperActualizado =
      await program.account.wallpaper.fetch(wallpaperPda);

    expect(wallpaperActualizado.precioLamports.toNumber()).to.equal(
      2000000000
    );

    // 6. Rechazar modificación desde otra wallet
    const intruso = anchor.web3.Keypair.generate();
    rechazado = false;

    try {
      await program.methods
        .actualizarPrecio(new anchor.BN(500))
        .accounts({
          galeria: galeriaPda,
          wallpaper: wallpaperPda,
          owner: intruso.publicKey,
        })
        .signers([intruso])
        .rpc();
    } catch {
      rechazado = true;
    }

    expect(rechazado).to.equal(true);

    // 7. Rechazar eliminación desde otra wallet
    rechazado = false;

    try {
      await program.methods
        .eliminarWallpaper()
        .accounts({
          galeria: galeriaPda,
          wallpaper: wallpaperPda,
          owner: intruso.publicKey,
        })
        .signers([intruso])
        .rpc();
    } catch {
      rechazado = true;
    }

    expect(rechazado).to.equal(true);

    // 8. Eliminar wallpaper como propietario
    await program.methods
      .eliminarWallpaper()
      .accounts({
        galeria: galeriaPda,
        wallpaper: wallpaperPda,
        owner,
      })
      .rpc();

    const wallpaperEliminado =
      await program.account.wallpaper.fetchNullable(wallpaperPda);

    expect(wallpaperEliminado).to.equal(null);

    console.log(
      "Todas las comprobaciones de Forza Wallpapers finalizaron correctamente."
    );
  });
});