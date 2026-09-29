/** Primeiro valor de um parâmetro da URL (?a=1&a=2 vira "1"). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** ?pagina=N como inteiro >= 1; qualquer valor inválido vira 1. */
export function parsePage(value: string | string[] | undefined): number {
  const page = Number.parseInt(firstParam(value) ?? "", 10);
  return Number.isFinite(page) && page > 1 ? page : 1;
}
