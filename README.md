# Forza Wallpapers 🏎️

Aplicación descentralizada (dApp) para crear galerías y publicar wallpapers de vehículos de **Forza Horizon 5 y Forza Motorsport**, utilizando Solana y tecnología blockchain.

El proyecto integra un programa desarrollado en Rust con Anchor, una interfaz web en React y un agente de inteligencia artificial que permite consultar información de la galería mediante lenguaje natural desde la terminal.

## 1. Objetivo del proyecto

Forza Wallpapers permite administrar una galería de wallpapers vinculada a una wallet de Solana.

El proyecto combina una temática automotriz con tecnología blockchain, utilizando cuentas y direcciones derivadas de programa (PDAs) para almacenar y administrar la información.

Su arquitectura está compuesta por tres elementos principales:

- **Programa Solana:** administra las galerías y los wallpapers mediante instrucciones desarrolladas con Rust y Anchor.
- **Frontend:** proporciona una interfaz web para interactuar con la aplicación y conectar wallets compatibles.
- **Agente de IA:** permite consultar información de los wallpapers mediante preguntas en lenguaje natural desde la terminal.

## 2. Características principales

### Programa Solana

- Crear galerías asociadas a una wallet.
- Publicar wallpapers con título, juego, URL y precio.
- Consultar información de galerías y wallpapers.
- Actualizar el precio de un wallpaper.
- Eliminar wallpapers mediante instrucciones autorizadas.

### Aplicación web

- Interfaz desarrollada con React y TypeScript.
- Conexión con wallets compatibles.
- Compatibilidad con Phantom y Solflare.
- Consulta y presentación del catálogo de wallpapers.
- Integración de publicaciones de Instagram.

### Agente de inteligencia artificial

- Interacción mediante preguntas en lenguaje natural.
- Consulta de wallpapers publicados en Solana Devnet.
- Búsqueda de wallpapers mediante su identificador.
- Consulta de títulos, juegos, precios y descargas.
- Procesamiento de preguntas mediante un modelo local en LM Studio.
- Ejecución independiente desde la terminal, sin necesidad de integrarse al frontend.

## 3. Tecnologías utilizadas

**Blockchain y programa**

- Solana.
- Solana Devnet.
- Rust.
- Anchor Framework 0.31.1.
- Program Derived Addresses (PDAs).

**Frontend**

- React 19.
- TypeScript.
- Vite.
- Solana Web3.js.
- Solana Wallet Adapter.
- Phantom y Solflare.

**Agente de inteligencia artificial**

- Node.js 22.
- TypeScript.
- TSX.
- @solana/kit.
- LM Studio.
- Qwen 2.5 7B Instruct.
- API compatible con OpenAI.

## 4. Arquitectura y seguridad

El programa utiliza dos tipos principales de cuentas:

**Galería**

- Identifica al propietario.
- Almacena el nombre de la galería.
- Mantiene el contador de wallpapers.

**Wallpaper**

- Identifica al propietario y a su galería.
- Almacena el identificador, título, juego, URL, precio y descargas.

Se utilizan PDAs para derivar las direcciones de las cuentas:

- Galería: `["galeria", owner]`
- Wallpaper: `["wallpaper", galeria, id]`

Las instrucciones incorporan validaciones para proteger la integridad de los datos y restringir las operaciones al propietario autorizado.

La eliminación de un wallpaper cierra su cuenta y devuelve la renta al propietario.

**Consideraciones sobre los precios:**

El precio se almacena como información del wallpaper en lamports. El programa no procesa pagos ni realiza transferencias de SOL por las publicaciones.

## 5. Programa desplegado en Solana Devnet

**Program ID:**

`CpvzJ6dcKsmfZMAnmhyx8vs3H8UjEbQnnzzPN1b7RDcC`

**Red:** Solana Devnet.

[Consultar el programa en Solana Explorer](https://explorer.solana.com/address/CpvzJ6dcKsmfZMAnmhyx8vs3H8UjEbQnnzzPN1b7RDcC?cluster=devnet).

## 6. Requisitos

Para trabajar con el proyecto se recomienda contar con:

- Node.js 22.x.
- npm.
- Yarn.
- Rust y Cargo.
- Solana CLI.
- Anchor CLI 0.31.1.
- Visual Studio Code.
- Ubuntu o WSL para el entorno de desarrollo.
- LM Studio para ejecutar el modelo de inteligencia artificial localmente.

El agente requiere que LM Studio tenga disponible el modelo Qwen 2.5 7B Instruct y su servidor de API esté iniciado.

## 7. Instalación y ejecución

### 7.1. Programa Solana

Desde la raíz del proyecto:

```bash
yarn install
```

Configurar Solana para utilizar Devnet:

```bash
solana config set --url devnet
```

Compilar el programa:

```bash
anchor build
```

Ejecutar las pruebas automatizadas en Localnet:

```bash
anchor test --provider.cluster localnet --skip-lint
```

### 7.2. Frontend

Desde la raíz del proyecto:

```bash
cd app
npm install
npm run dev
```

Abrir en el navegador la dirección local proporcionada por Vite, normalmente:

`http://localhost:5173/`

Conectar una wallet compatible configurada para Solana Devnet.

Para generar una compilación de producción:

```bash
npm run build
```

### 7.3. Agente de inteligencia artificial

Desde la raíz del proyecto:

```bash
cd agente
npm install
```

Crear el archivo de configuración local:

```bash
cp .env.example .env
```

Editar el archivo `.env` con los valores correspondientes al entorno de ejecución.

Variables necesarias:

| Variable | Descripción |
|---|---|
| `RPC_URL` | Dirección RPC de Solana. |
| `GALERIA` | Nombre de referencia de la galería. |
| `OWNER` | Dirección pública del propietario. |
| `LLM_BASE_URL` | Dirección del servidor API de LM Studio. |
| `LLM_MODEL` | Modelo de lenguaje que utilizará el agente. |
| `LLM_API_KEY` | Clave requerida por el cliente compatible con OpenAI. |

Ejemplo de configuración:

```env
RPC_URL=https://api.devnet.solana.com
GALERIA=Mi colección
OWNER=TU_DIRECCION_PUBLICA

LLM_BASE_URL=http://DIRECCION_DEL_HOST_WINDOWS:1235/v1
LLM_MODEL=qwen2.5-7b-instruct-1m
LLM_API_KEY=lm-studio
```

**Configuración de LM Studio:**

1. Instalar y abrir LM Studio.
2. Descargar el modelo Qwen 2.5 7B Instruct.
3. Iniciar el servidor de API compatible con OpenAI.
4. Configurar `LLM_BASE_URL` con una dirección accesible desde el entorno donde se ejecuta el agente.

Si se utiliza Ubuntu mediante WSL y LM Studio se ejecuta en Windows, debe configurarse la dirección IP del host Windows y el puerto correspondiente.

Una vez configurado el entorno y con el servidor de LM Studio activo, ejecutar:

```bash
npx tsx src/agente.ts
```

El agente mostrará una interfaz de terminal donde se pueden escribir preguntas sobre los wallpapers publicados.

Para finalizar la sesión:

```text
salir
```

## 8. Pruebas realizadas

Se ejecutaron pruebas automatizadas del programa en Localnet que comprueban:

- Creación de galería.
- Rechazo de título vacío.
- Rechazo de URL demasiado larga.
- Publicación válida de un wallpaper.
- Actualización del precio.
- Rechazo de modificaciones realizadas por otra wallet.
- Rechazo de eliminación realizada por otra wallet.
- Eliminación autorizada por el propietario.

**Resultado obtenido:**

`1 passing (2s)`

Las comprobaciones finalizaron correctamente en Localnet.

La evidencia de ejecución se conserva en `evidencia-pruebas-localnet.txt`.

También se realizaron comprobaciones del agente de IA para verificar la consulta de la galería, la búsqueda por identificador y la presentación de los datos obtenidos desde Solana Devnet.

## 9. Estructura del proyecto

```text
forza_wallpapers/
│
├── agente/
│   ├── src/
│   │   ├── tools/
│   │   ├── agente.ts
│   │   ├── config.ts
│   │   ├── llm.ts
│   │   ├── pdas.ts
│   │   ├── solana.ts
│   │   ├── prueba-galeria.ts
│   │   └── prueba-llm.ts
│   ├── js-client-1.0.0.tgz
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── app/
│   ├── clients/
│   ├── public/
│   ├── src/
│   │   ├── solana/
│   │   ├── App.tsx
│   │   ├── WallpapersPage.tsx
│   │   └── acciones.ts
│   ├── codama.json
│   └── package.json
│
├── programs/
│   └── forza_wallpapers/
│       └── src/
│           └── lib.rs
│
├── migrations/
│   └── deploy.ts
│
├── tests/
│   └── forza_wallpapers.ts
│
├── Anchor.toml
├── Cargo.toml
├── Cargo.lock
├── package.json
├── yarn.lock
├── tsconfig.json
├── .gitignore
├── evidencia-pruebas-localnet.txt
└── README.md
```

## 10. Seguridad y consideraciones

- No publicar archivos `.env` ni credenciales privadas.
- No compartir frases semilla ni archivos de keypairs.
- Mantener protegidos los archivos de configuración que contengan información privada.
- Los archivos de dependencias y compilación no necesitan incluirse en el repositorio.
- El agente realiza consultas de lectura a Solana y no ejecuta operaciones de escritura sobre la blockchain.
- La ejecución del modelo de lenguaje se realiza localmente mediante LM Studio.

## 11. Contribución personal

El proyecto comprende el diseño y desarrollo de un programa en Rust con Anchor, la definición de cuentas y PDAs, las validaciones de seguridad y propiedad, las instrucciones de administración y las pruebas automatizadas.

También incluye el desarrollo de una interfaz web con React y TypeScript, la conexión con wallets de Solana, la presentación visual del catálogo y la integración de publicaciones de Instagram.

Como complemento, se desarrolló un agente de inteligencia artificial independiente que utiliza un modelo de lenguaje local para interpretar preguntas y consultar información almacenada en Solana Devnet.

## 12. Estado del proyecto

El programa está desplegado en Solana Devnet y cuenta con pruebas automatizadas aprobadas en Localnet.

El frontend está preparado para interactuar con la aplicación mediante una wallet compatible.

El agente de inteligencia artificial funciona de manera independiente desde la terminal y permite consultar información de los wallpapers publicados en la galería.

---

**Forza Wallpapers**  
Proyecto de desarrollo blockchain enfocado en el catálogo de wallpapers de Forza Horizon 5 y Forza Motorsport.