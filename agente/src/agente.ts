
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { consultarLLM } from "./llm.js";
import { leerWallpapers } from "./tools/leer-wallpapers.js";
import { obtenerWallpaperPorId } from "./tools/obtener-wallpaper.js";

const instrucciones = `
Eres el asistente inteligente de Forza Wallpapers.

Forza Wallpapers es una dApp dedicada a los wallpapers de:
- Forza Horizon 5.
- Forza Motorsport.

Tu función es ayudar a consultar, identificar y explicar los wallpapers
publicados en la galería de Solana Devnet.

Puedes solicitar dos acciones:
1. LISTAR: consultar todos los wallpapers publicados.
2. BUSCAR: consultar un wallpaper mediante su ID.

Cuando el usuario pregunte por wallpapers publicados, existentes,
disponibles o por el contenido de la galería, responde con este JSON:
{"accion":"listar"}

Cuando pregunte por un wallpaper con un ID específico, responde:
{"accion":"buscar","id":"8"}

Si no necesita consultar la blockchain, responde:
{"accion":"responder"}

Devuelve exclusivamente un objeto JSON válido, sin Markdown ni explicaciones.
No inventes IDs.
`;

async function identificarAccion(pregunta: string) {
  const respuesta = await consultarLLM([
    { role: "system", content: instrucciones },
    { role: "user", content: pregunta },
  ]);

  const coincidencia = respuesta.match(/\{[\s\S]*\}/);

  if (!coincidencia) {
    return { accion: "responder" };
  }

  try {
    return JSON.parse(coincidencia[0]) as {
      accion: string;
      id?: string;
    };
  } catch {
    return { accion: "responder" };
  }
}

// Prepara los datos y convierte los precios de lamports a SOL.
function prepararDatos(registro: unknown): unknown {
  if (!registro || typeof registro !== "object") {
    return registro;
  }

  const resultado = { ...registro } as Record<string, unknown>;

  if (resultado.precioLamports !== undefined) {
    const lamports = BigInt(
      String(resultado.precioLamports)
    );

    resultado.precioLamports = lamports.toString();

    resultado.precioLamportsFormateado =
      new Intl.NumberFormat("en-US").format(lamports);

    resultado.precioSOL =
      (Number(lamports) / 1_000_000_000).toFixed(7);
  }

  return resultado;
}

async function ejecutarAgente(pregunta: string) {
  console.log("\nProcesando pregunta...\n");

  const accion = await identificarAccion(pregunta);

  let datos: unknown = null;

  if (accion.accion === "listar") {
    datos = await leerWallpapers();
  } else if (
    accion.accion === "buscar" &&
    accion.id &&
    /^\d+$/.test(accion.id)
  ) {
    datos = await obtenerWallpaperPorId(BigInt(accion.id));
  }

  const datosPreparados = Array.isArray(datos)
    ? datos.map(prepararDatos)
    : prepararDatos(datos);

  const datosTexto = JSON.stringify(
    datosPreparados,
    (_clave, valor) =>
      typeof valor === "bigint" ? valor.toString() : valor
  );

  const respuestaFinal = await consultarLLM([
    {
      role: "system",
      content: `
Eres el asistente de Forza Wallpapers.

Responde siempre en español, de forma clara y natural.
La dApp contiene wallpapers de Forza Horizon 5 y Forza Motorsport.

Utiliza exclusivamente los datos proporcionados para afirmar información
sobre wallpapers, IDs, precios, juegos y descargas.

REGLAS IMPORTANTES SOBRE LOS PRECIOS:

- precioLamports contiene el valor original en lamports.
- precioLamportsFormateado contiene ese mismo valor con separadores de miles.
- precioSOL contiene la conversión exacta a SOL calculada por el programa.
- Reproduce exactamente los valores proporcionados.
- No elimines, agregues ni modifiques dígitos.
- No calcules nuevamente la conversión.
- Nunca confundas lamports con SOL.
- Si muestras un precio, indica ambas unidades.

Si la acción es "responder", contesta directamente la pregunta
sin afirmar que consultaste Solana.

Si la acción es "buscar" y los datos son null,
indica que no encontraste el wallpaper solicitado.

Si la acción es "listar" y los datos son un arreglo vacío,
indica que la galería no tiene wallpapers publicados.

No inventes información de la blockchain.
`,
    },
    {
      role: "user",
      content: `
Pregunta: ${pregunta}

Acción ejecutada: ${accion.accion}

Datos consultados en Solana:
${datosTexto}

Si la acción es "responder", no se realizó ninguna consulta a Solana.
Responde directamente la pregunta del usuario.

Si la acción es "buscar" y los datos son null,
indica que no encontraste ese wallpaper.

Si la acción es "listar" y los datos son un arreglo vacío,
indica que no hay wallpapers publicados.

IMPORTANTE:
Cuando proporciones precios, copia exactamente las cantidades
de precioLamportsFormateado y precioSOL.
`,
    },
  ]);

  console.log("Asistente:", respuestaFinal);
}

async function main() {
  const terminal = createInterface({ input, output });

  console.log("==================================");
  console.log("       FORZA WALLPAPERS AI");
  console.log("==================================");
  console.log("Escribe tu pregunta o escribe salir.\n");

  while (true) {
    const pregunta = await terminal.question("Tú: ");

    if (pregunta.trim().toLowerCase() === "salir") {
      break;
    }

    if (!pregunta.trim()) {
      continue;
    }

    try {
      await ejecutarAgente(pregunta);
    } catch (error) {
      console.error("\nError del agente:", error);
    }

    console.log("");
  }

  terminal.close();
}

main().catch((error) => {
  console.error("Error al iniciar el agente:", error);
  process.exitCode = 1;
});