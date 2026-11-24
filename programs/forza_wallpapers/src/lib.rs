// Galería de Wallpapers - Forza Horizon & Forza Motorsport
// Explicación de la arquitectura y las validaciones en el README.md

use anchor_lang::prelude::*;

// Reemplazar con el ID real ('anchor keys list')
declare_id!("CpvzJ6dcKsmfZMAnmhyx8vs3H8UjEbQnnzzPN1b7RDcC");

// Límites de tamaño (en bytes)
pub const MAX_NOMBRE_GALERIA: usize = 30;
pub const MAX_TITULO: usize = 30;
pub const MAX_JUEGO: usize = 20;
pub const MAX_URL_IMAGEN: usize = 80;

// Semillas de las PDAs
pub const SEED_GALERIA: &[u8] = b"galeria";
pub const SEED_WALLPAPER: &[u8] = b"wallpaper";

#[program]
pub mod forza_wallpapers {
    use super::*;

    // Crea la galería (cuenta raíz) del usuario
    pub fn crear_galeria(ctx: Context<CrearGaleria>, nombre_galeria: String) -> Result<()> {
        require!(!nombre_galeria.trim().is_empty(), ErroresGaleria::CampoVacio);
        require!(
            nombre_galeria.len() <= MAX_NOMBRE_GALERIA,
            ErroresGaleria::NombreGaleriaMuyLargo
        );

        let galeria = &mut ctx.accounts.galeria;
        galeria.owner = ctx.accounts.owner.key();
        galeria.nombre_galeria = nombre_galeria;
        galeria.total_wallpapers = 0;
        galeria.bump = ctx.bumps.galeria;
        Ok(())
    }

    // Publica un wallpaper nuevo y aumenta el contador de la galeria
    pub fn publicar_wallpaper(
        ctx: Context<PublicarWallpaper>,
        titulo: String,
        juego: String,
        url_imagen: String,
        precio_lamports: u64,
    ) -> Result<()> {
        require!(!titulo.trim().is_empty(), ErroresGaleria::CampoVacio);
        require!(!juego.trim().is_empty(), ErroresGaleria::CampoVacio);
        require!(!url_imagen.trim().is_empty(), ErroresGaleria::CampoVacio);
        require!(titulo.len() <= MAX_TITULO, ErroresGaleria::TituloMuyLargo);
        require!(juego.len() <= MAX_JUEGO, ErroresGaleria::JuegoMuyLargo);
        require!(url_imagen.len() <= MAX_URL_IMAGEN, ErroresGaleria::UrlMuyLarga);

        let galeria = &mut ctx.accounts.galeria;
        let wallpaper = &mut ctx.accounts.wallpaper;

        wallpaper.owner = ctx.accounts.owner.key();
        wallpaper.galeria = galeria.key();
        wallpaper.id = galeria.total_wallpapers;
        wallpaper.titulo = titulo;
        wallpaper.juego = juego;
        wallpaper.url_imagen = url_imagen;
        wallpaper.precio_lamports = precio_lamports;
        wallpaper.descargas = 0;
        wallpaper.bump = ctx.bumps.wallpaper;

        // Suma segura contra overflow
        galeria.total_wallpapers = galeria
            .total_wallpapers
            .checked_add(1)
            .ok_or(ErroresGaleria::ContadorDesbordado)?;
        Ok(())
    }

    // Cambia el precio (solo el owner, validado en el contexto)
    pub fn actualizar_precio(ctx: Context<ActualizarPrecio>, nuevo_precio: u64) -> Result<()> {
        ctx.accounts.wallpaper.precio_lamports = nuevo_precio;
        Ok(())
    }

    // Cierra la cuenta ('close = owner' deuvleve la renta al creador)
    pub fn eliminar_wallpaper(_ctx: Context<EliminarWallpaper>) -> Result<()> {
        Ok(())
    }
}

//-------------------------------------------------------------------------------------------------
// Contextos de cuentas
//-------------------------------------------------------------------------------------------------

#[derive(Accounts)]
pub struct CrearGaleria<'info> {
    #[account(
        init,
        payer = owner,
        space = Galeria::SPACE,
        seeds = [SEED_GALERIA, owner.key().as_ref()],
        bump
    )]
    pub galeria: Account<'info, Galeria>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublicarWallpaper<'info> {
    #[account(
        mut,
        seeds = [SEED_GALERIA, owner.key().as_ref()],
        bump = galeria.bump,
        has_one = owner @ ErroresGaleria::NoAutorizado
    )]
    pub galeria: Account<'info, Galeria>,

    // PDA: ("wallpaper", galeria, id en u64)
    #[account(
        init,
        payer = owner,
        space = Wallpaper::SPACE,
        seeds = [
            SEED_WALLPAPER,
            galeria.key().as_ref(),
            galeria.total_wallpapers.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub wallpaper: Account<'info, Wallpaper>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ActualizarPrecio<'info> {
    #[account(
        seeds = [SEED_GALERIA, owner.key().as_ref()],
        bump = galeria.bump,
        has_one = owner @ ErroresGaleria::NoAutorizado
    )]
    pub galeria: Account<'info, Galeria>,

    #[account(
        mut,
        seeds = [
            SEED_WALLPAPER,
            galeria.key().as_ref(),
            wallpaper.id.to_le_bytes().as_ref()
        ],
        bump = wallpaper.bump,
        has_one = owner @ ErroresGaleria::NoAutorizado,
        has_one = galeria @ ErroresGaleria::GaleriaInvalida
    )]
    pub wallpaper: Account<'info, Wallpaper>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct EliminarWallpaper<'info> {
    #[account(
        seeds = [SEED_GALERIA, owner.key().as_ref()],
        bump = galeria.bump,
        has_one = owner @ ErroresGaleria::NoAutorizado
    )]
    pub galeria: Account<'info, Galeria>,

    #[account(
        mut,
        close = owner,
        seeds = [
            SEED_WALLPAPER,
            galeria.key().as_ref(),
            wallpaper.id.to_le_bytes().as_ref()
        ],
        bump = wallpaper.bump,
        has_one = owner @ ErroresGaleria::NoAutorizado,
        has_one = galeria @ ErroresGaleria::GaleriaInvalida
    )]
    pub wallpaper: Account<'info, Wallpaper>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

//-------------------------------------------------------------------------------------------------
// Cuentas
//-------------------------------------------------------------------------------------------------

// Cuenta raíz
#[account]
pub struct Galeria {
    pub owner: Pubkey,
    pub nombre_galeria: String,
    pub total_wallpapers: u64, // También es el ID del próximo wallpaper
    pub bump: u8,
}

impl Galeria {
    // Discriminador + Owner + Nombre + Contador + Bump
    pub const SPACE: usize = 8 + 32 + (4 + MAX_NOMBRE_GALERIA) + 8 + 1;
}

// Cuenta entidad
#[account]
pub struct Wallpaper {
    pub owner: Pubkey,
    pub galeria: Pubkey,
    pub id: u64,
    pub titulo: String,
    pub juego: String,
    pub url_imagen: String,
    pub precio_lamports: u64,
    pub descargas: u64,
    pub bump: u8,
}

impl Wallpaper {
    pub const SPACE: usize = 8
        + 32
        + 32
        + 8
        + (4 + MAX_TITULO)
        + (4 + MAX_JUEGO)
        + (4 + MAX_URL_IMAGEN)
        + 8
        + 8
        + 1;
}

//-----------------------------------------------------------------
// Errores personalizados
//-----------------------------------------------------------------

#[error_code]
pub enum ErroresGaleria {
    #[msg("El nombre de la galería excede el máximo de 30 caracteres.")]
    NombreGaleriaMuyLargo,
    #[msg("El titulo excede el máximo de 30 caracteres.")]
    TituloMuyLargo,
    #[msg("El nombre del juego excede el máximo de 20 caracteres.")]
    JuegoMuyLargo,
    #[msg("La URL de la imagen excede el máximo de 80 caracteres.")]
    UrlMuyLarga,
    #[msg("Los campos de texto no pueden estar vacíos.")]
    CampoVacio,
    #[msg("Permiso denegado: solo el propietario puede realizar esta acción.")]
    NoAutorizado,
    #[msg("El wallpaper no pertenece a la galería indicada.")]
    GaleriaInvalida,
    #[msg("El contador de wallpapers se desbordó.")]
    ContadorDesbordado,
}