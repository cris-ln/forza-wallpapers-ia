import process from "node:process";
import "dotenv/config";

function obtenerVariable(nombre: string): string {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta configurar la variable ${nombre} en .env`);
  }

  return valor;
}

export const config = {
  rpcUrl: obtenerVariable("RPC_URL"),
  galeria: obtenerVariable("GALERIA"),
  owner: obtenerVariable("OWNER"),

  llmBaseUrl: obtenerVariable("LLM_BASE_URL"),
  llmModel: obtenerVariable("LLM_MODEL"),
  llmApiKey: obtenerVariable("LLM_API_KEY"),
};