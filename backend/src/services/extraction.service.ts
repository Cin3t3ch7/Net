/**
 * Tipos de búsqueda soportados por la plataforma.
 */
export enum SearchType {
  PASSWORD_RESET = "PASSWORD_RESET",
  LOGIN_CODE = "LOGIN_CODE",
  LOGOUT_CODE = "LOGOUT_CODE",
  UPDATE_HOME = "UPDATE_HOME",
  HOME_CODE = "HOME_CODE", // Tipo 5
  TRAVELING = "TRAVELING", // Tipo 6 (ahora usa el mismo pattern que el 5)
  ACTIVATE_TV = "ACTIVATE_TV",
}

export interface ExtractionResult {
  found: boolean;
  value: string | null;
}

/**
 * Servicio encargado de aplicar expresiones regulares sobre el cuerpo
 * del correo proveído y extraer la información precisa.
 */
export function extractDataFromEmailBody(bodyText: string, searchType: SearchType | string): ExtractionResult {
  if (!bodyText) {
    return { found: false, value: null };
  }

  // Mapa de expresiones regulares según el tipo de búsqueda
  const regexMap: Record<string, RegExp> = {
    [SearchType.PASSWORD_RESET]: /https:\/\/www\.netflix\.com\/password\?g=[^"\s<>]+/i,
    // Busca el lrg-number y atrapa su grupo de 4 dígitos
    [SearchType.LOGIN_CODE]: /lrg-number[^>]*>\s*(\d{4})\s*<\/td>/i,
    // Busca td común y atrapa 6 dígitos
    [SearchType.LOGOUT_CODE]: /<td\b[^>]*>\s*([0-9]{6})\s*<\/td>/i,
    [SearchType.UPDATE_HOME]: /https:\/\/www\.netflix\.com\/account\/update-primary-location\?nftoken=[a-zA-Z0-9%+=&\/]+/i,
    [SearchType.HOME_CODE]: /https:\/\/www\.netflix\.com\/account\/travel\/verify\?nftoken=[a-zA-Z0-9%+=\/]+/i,
    [SearchType.TRAVELING]: /https:\/\/www\.netflix\.com\/account\/travel\/verify\?nftoken=[a-zA-Z0-9%+=\/]+/i,
    [SearchType.ACTIVATE_TV]: /https:\/\/www\.netflix\.com\/ilum\?code=[a-zA-Z0-9%+=&\/]+/i,
  };

  const regex = regexMap[searchType];
  if (!regex) {
    return { found: false, value: null }; // Tipo de búsqueda no reconocido
  }

  const match = bodyText.match(regex);
  if (!match) {
    return { found: false, value: null };
  }

  // Si la regex contiene grupos de captura (ej. códigos de 4/6 dígitos), devuelve el primer grupo.
  // Si no (ej. un enlace completo), devuelve el full match.
  const extractedValue = match[1] ? match[1] : match[0];

  return {
    found: true,
    value: extractedValue.trim(),
  };
}
