import { query } from "../db/pool";
import { decryptImapPassword } from "../modules/imap/imap.module";
import type { ImapConfigRow } from "../types";
import { logger } from "../db/logger";

export interface ResolvedImapConfig {
  domain: string;
  server: string;
  port: number;
  email: string;
  passwordDecrypted: string;
  useSsl: boolean;
}

/**
 * Normaliza el email, extrae el dominio y busca la configuración IMAP.
 * Si no la encuentra, hace fallback automático a gmail.com.
 * Si tampoco existe gmail.com, lanza un error genérico.
 */
export async function resolveImapConfig(targetEmail: string): Promise<ResolvedImapConfig> {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const domainParts = normalizedEmail.split("@");

  if (domainParts.length !== 2 || !domainParts[1]) {
    throw new Error("Formato de correo inválido o no se pudo extraer el dominio.");
  }

  const domain = domainParts[1];

  // 1. Buscar configuración para el dominio exacto
  let { rows } = await query<ImapConfigRow>(
    `SELECT * FROM imap_configs WHERE domain = $1 LIMIT 1`,
    [domain]
  );

  let configFound = rows[0];

  // 2. Fallback a gmail.com si no se encontró
  if (!configFound) {
    logger.debug({ requestedDomain: domain }, "Configuración IMAP no encontrada, intentando fallback a gmail.com");
    
    const fallbackResponse = await query<ImapConfigRow>(
      `SELECT * FROM imap_configs WHERE domain = $1 LIMIT 1`,
      ["gmail.com"]
    );
    configFound = fallbackResponse.rows[0];
  }

  // 3. Abortar si tampoco existe el fallback
  if (!configFound) {
    logger.error({ requestedDomain: domain }, "No existe configuración IMAP para el dominio solicitado ni para el fallback (gmail.com)");
    // Error genérico por seguridad
    throw new Error("No se pudo iniciar la conexión para este dominio. Configuración no disponible.");
  }

  // 4. Retornar configuración lista para conectar (desencriptando el password)
  return {
    domain: configFound.domain,
    server: configFound.server,
    port: configFound.port,
    email: configFound.email,
    passwordDecrypted: decryptImapPassword(configFound.password_enc),
    useSsl: configFound.use_ssl,
  };
}
