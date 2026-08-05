import { supabase } from './supabase';

export const BUCKET_FOTOS = 'fotos-camisas';

/** Extrai o caminho do arquivo dentro do bucket a partir da URL pública do Supabase Storage. */
function extrairCaminhoStorage(url: string): string | null {
  const marcador = `/storage/v1/object/public/${BUCKET_FOTOS}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null; // URL externa (não é do nosso bucket) — não mexe
  return url.slice(idx + marcador.length);
}

/** Remove uma foto antiga do bucket (usado ao trocar ou excluir a foto de uma camisa, pra não deixar lixo ocupando espaço). */
export async function removerFotoAntiga(url: string | null | undefined) {
  if (!url) return;
  const caminho = extrairCaminhoStorage(url);
  if (!caminho) return;
  await supabase.storage.from(BUCKET_FOTOS).remove([caminho]);
}
