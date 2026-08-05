/**
 * Accès tolérant au stockage local : navigation privée, cookies bloqués ou
 * quota dépassé ne doivent jamais interrompre la partie.
 */
export function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Rien à rattraper : seule la mémorisation est perdue.
  }
}
