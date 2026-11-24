import "./App.css";
import {
  useConnection,
  useWallet,
  useAnchorWallet,
} from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  crearGaleria,
  publicarWallpaper,
  actualizarPrecio,
  eliminarWallpaper,
  obtenerGaleria,
  obtenerWallpapers,
  lamportsASol,
  solALamports,
  obtenerMensajeError,
} from "./acciones";
import type { WallpaperCatalogo } from "./acciones";


function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    const procesar = () => {
      (window as any).instgrm?.Embeds?.process();
    };

    const scriptExistente = document.querySelector(
      'script[src="https://www.instagram.com/embed.js"]'
    );

    if (!scriptExistente) {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = procesar;
      document.body.appendChild(script);
    } else {
      procesar();
    }
  }, [url]);

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{
        background: "#fff",
        border: 0,
        borderRadius: 8,
        margin: "10px auto",
        maxWidth: 540,
        minWidth: 280,
        width: "100%",
      }}
    >
      <a href={url} target="_blank" rel="noreferrer">
        Ver publicación en Instagram
      </a>
    </blockquote>
  );
}

export default function WallpapersPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();

  const [galeria, setGaleria] = useState<any>(null);
  const [wallpapers, setWallpapers] = useState<WallpaperCatalogo[]>([]);
  const [nombreGaleria, setNombreGaleria] = useState("");
  const [titulo, setTitulo] = useState("");
  const [juego, setJuego] = useState("Forza Horizon 5");
  const [urlImagen, setUrlImagen] = useState("");
  const [precio, setPrecio] = useState("0.01");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!wallet.publicKey) {
      setGaleria(null);
      setWallpapers([]);
      return;
    }

    try {
      const datosGaleria = await obtenerGaleria(
        connection,
        wallet.publicKey
      );

      setGaleria(datosGaleria);

      if (datosGaleria) {
        const lista = await obtenerWallpapers(
          connection,
          datosGaleria.publicKey
        );
        setWallpapers(lista);
      } else {
        setWallpapers([]);
      }
    } catch (error) {
      setMensaje(obtenerMensajeError(error));
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  async function ejecutar(accion: () => Promise<string>) {
    setCargando(true);
    setMensaje("");

    try {
      const resultado = await accion();
      setMensaje(resultado);
      await cargarDatos();
    } catch (error) {
      setMensaje(obtenerMensajeError(error));
    } finally {
      setCargando(false);
    }
  }

  async function manejarCrearGaleria(e: React.FormEvent) {
    e.preventDefault();

    if (!wallet.publicKey || !wallet.signTransaction) return;

    await ejecutar(() =>
      crearGaleria(connection, anchorWallet!, nombreGaleria)
    );

    setNombreGaleria("");
  }

  async function manejarPublicar(e: React.FormEvent) {
    e.preventDefault();

    if (!wallet.publicKey || !wallet.signTransaction) return;

    await ejecutar(() =>
      publicarWallpaper(
        connection,
        anchorWallet!,
        titulo,
        juego,
        urlImagen,
        solALamports(precio)
      )
    );

    setTitulo("");
    setUrlImagen("");
    setPrecio("0.01");
  }

  async function manejarActualizar(id: number) {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    await ejecutar(() =>
      actualizarPrecio(
        connection,
        anchorWallet!,
        id,
        solALamports(nuevoPrecio)
      )
    );

    setNuevoPrecio("");
  }

  async function manejarEliminar(id: number) {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    if (!window.confirm("¿Deseas eliminar este wallpaper?")) return;

    await ejecutar(() =>
      eliminarWallpaper(connection, anchorWallet!, id)
    );
  }

  return (
    <main className="pagina">
      <header className="encabezado">
        <div>
          <h1>Forza Wallpapers</h1>
          <p>Tu colección de wallpapers en Solana</p>
        </div>

        <WalletMultiButton />
      </header>
      <section className="hero">
  <div className="hero-contenido">
    <span className="hero-etiqueta">
      THE ULTIMATE RACING COLLECTION
    </span>

    <h2>
      YOUR RIDE.
      <br />
      YOUR STYLE.
    </h2>

    <p>
      Descubre, colecciona y comparte wallpapers
      de tus automóviles favoritos.
    </p>

    <a href="#catalogo" className="hero-boton">
      EXPLORAR COLECCIÓN →
    </a>
  </div>

  <div className="hero-numero">
    FH5 / FM
  </div>
</section>

      {mensaje && (
        <div className="mensaje" role="status">
          {mensaje}
        </div>
      )}

      {!wallet.connected ? (
        <section className="panel">
          <h2>Conecta tu wallet</h2>
          <p>
            Conecta Phantom o Solflare para administrar tu galería.
          </p>
        </section>
      ) : (
        <>
          {!galeria && (
            <section className="panel">
              <h2>Crear galería</h2>

              <form onSubmit={manejarCrearGaleria}>
                <input
                  value={nombreGaleria}
                  onChange={(e) => setNombreGaleria(e.target.value)}
                  placeholder="Nombre de tu galería"
                  maxLength={30}
                  required
                />

                <button disabled={cargando}>
                  Crear galería
                </button>
              </form>
            </section>
          )}

          {galeria && (
            <>
              <section className="panel">
                <h2>{galeria.nombreGaleria}</h2>
                <p>
                  Wallpapers publicados: {wallpapers.length}
                </p>
              </section>

              <section className="panel">
                <h2>Publicar wallpaper</h2>

                <form onSubmit={manejarPublicar}>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Título"
                    maxLength={30}
                    required
                  />

                  <select
                    value={juego}
                    onChange={(e) => setJuego(e.target.value)}
                  >
                    <option>Forza Horizon 5</option>
                    <option>Forza Motorsport</option>
                  </select>

                  <input
                    type="url"
                    value={urlImagen}
                    onChange={(e) => setUrlImagen(e.target.value)}
                    placeholder="URL de la imagen"
                    required
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.000000001"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="Precio en SOL"
                    required
                  />

                  <button disabled={cargando}>
                    Publicar wallpaper
                  </button>
                </form>
              </section>

              <section className="catalogo">
                <h2>Mi colección</h2>

                {wallpapers.length === 0 ? (
                  <p>Aún no tienes wallpapers publicados.</p>
                ) : (
                  <div className="rejilla">
                    {wallpapers.map((item) => (
                      <article className="tarjeta" key={item.id}>
                        <InstagramEmbed url={item.urlImagen} />

                        <div className="contenido-tarjeta">
                          <h3>{item.titulo}</h3>
                          <p>{item.juego}</p>
                          <p>
                            Precio: {lamportsASol(item.precioLamports)} SOL
                          </p>
                          <p>Descargas: {item.descargas}</p>

                          <input
                            type="number"
                            min="0"
                            step="0.000000001"
                            value={nuevoPrecio}
                            onChange={(e) =>
                              setNuevoPrecio(e.target.value)
                            }
                            placeholder="Nuevo precio en SOL"
                          />

                          <button
                            disabled={cargando || !nuevoPrecio}
                            onClick={() => manejarActualizar(item.id)}
                          >
                            Actualizar precio
                          </button>

                          <button
                            className="boton-eliminar"
                            disabled={cargando}
                            onClick={() => manejarEliminar(item.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}

      {cargando && <p>Procesando transacción...</p>}
    </main>
  );
}