/**
 * Clau de cerca: minúscules, sense accents ni punt volat («Àlex» → «alex», «col·lecció» → «colleccio»).
 * Es desa al costat del nom i s'aplica també al text cercat, perquè la cerca
 * no distingeixi majúscules ni accents (HU-33).
 */
export function searchKey(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}