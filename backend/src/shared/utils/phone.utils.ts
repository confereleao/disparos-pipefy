export function normalizePhone(raw: string): string {
  // Remove tudo que não é dígito
  const digits = raw.replace(/\D/g, '');

  // Sem ddd nem DDI — número muito curto
  if (digits.length < 8) return digits;

  // Já tem DDI 55 (Brasil)
  if (digits.startsWith('55') && digits.length >= 12) return digits;

  // Número com DDD (10 ou 11 dígitos) — adiciona 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Brasil: 55 + DDD (2) + número (8 ou 9) = 12 ou 13 dígitos
  return /^55\d{10,11}$/.test(normalized);
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.startsWith('55') && normalized.length === 13) {
    const ddd = normalized.slice(2, 4);
    const num = normalized.slice(4);
    return `+55 (${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  }
  if (normalized.startsWith('55') && normalized.length === 12) {
    const ddd = normalized.slice(2, 4);
    const num = normalized.slice(4);
    return `+55 (${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }
  return phone;
}
