
import { consultarLLM } from "./llm.js";

async function main() {
  console.log("Probando conexión con Qwen...");

  const respuesta = await consultarLLM([
    {
      role: "system",
      content: "Eres un asistente especializado en Forza Wallpapers. Responde en español."
    },
    {
      role: "user",
      content: "Preséntate brevemente y explica qué puedes hacer."
    }
  ]);

  console.log("\nRespuesta de Qwen:");
  console.log(respuesta);
}

main().catch((error) => {
  console.error("Error al probar Qwen:", error);
  process.exitCode = 1;
});