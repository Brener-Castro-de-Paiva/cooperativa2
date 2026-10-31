/* ============================================================
   COJURIS — ADAPTADOR SUPABASE: ARQUIVOS (STORAGE)

   Usa o bucket privado definido em config.supabase.bucket.
   Os links de download são temporários (1 hora).
   ============================================================ */

import { obterCliente } from "./cliente.js";


export function criar(config) {

    const supabase = obterCliente(config);

    const bucket = () => supabase.storage.from(config.supabase.bucket);

    return {

        async enviar(caminho, arquivo, aoProgredir) {

            aoProgredir?.(0);

            const { error } = await bucket().upload(caminho, arquivo, {
                contentType: arquivo.type || "application/octet-stream",
                upsert: false
            });

            if (error) throw error;

            aoProgredir?.(1);

            return caminho;
        },


        async obterLink(caminho, nomeArquivo) {

            const { data, error } = await bucket()
                .createSignedUrl(caminho, 3600, {
                    download: nomeArquivo || true
                });

            if (error) throw error;

            return data.signedUrl;
        },


        async excluir(caminho) {

            const { error } = await bucket().remove([caminho]);

            if (error) throw error;
        }
    };
}
