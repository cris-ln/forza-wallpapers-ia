
import { config } from "./config.js";

interface Mensaje {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RespuestaLLM {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

export async function consultarLLM(
  mensajes: Mensaje[]
): Promise<string> {
  const respuesta = await fetch(
    `${config.llmBaseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.llmApiKey}`,
      },
      body: JSON.stringify({
        model: config.llmModel,
        messages: mensajes,
        temperature: 0.7,
      }),
    }
  );

  if (!respuesta.ok) {
    const error = await respuesta.text();

    throw new Error(
      `Error de LM Studio (${respuesta.status}): ${error}`
    );
  }

  const datos = await respuesta.json() as RespuestaLLM;

  const contenido = datos.choices?.[0]?.message?.content;

  if (!contenido) {
    throw new Error("El modelo no devolvió una respuesta.");
  }

  return contenido;
}