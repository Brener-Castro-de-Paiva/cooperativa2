/* ============================================================
   COJURIS — ADAPTADOR SUPABASE: BANCO

   Todos os registros novos ficam em uma tabela genérica
   "registros" (veja docs/supabase.sql):

   colecao   — o mesmo caminho lógico do Firestore,
               ex.: "mural" ou "comunicados/abc/comentarios"
   dados     — os campos do registro (jsonb)
   autor_uid — quem criou
   criado_em — data de criação

   O cadastro (interessados) e a lista de administradores
   continuam no Firebase nesta etapa. Para migrá-los,
   altere apenas as três funções marcadas abaixo.
   ============================================================ */

import { obterCliente } from "./cliente.js";
import { criar as criarFirebase } from "../firebase/banco.js";


export function criar(config) {

    const supabase = obterCliente(config);

    const firebase = criarFirebase(config);

    return {

        // ---- Mantidos no Firebase nesta etapa ----

        lerAdministrador: (uid) => firebase.lerAdministrador(uid),

        lerInteressado: (uid) => firebase.lerInteressado(uid),

        listarInteressados: () => firebase.listarInteressados(),


        // ---- Registros no Supabase ----

        // Aqui o cursor é a posição (número) do próximo item.

        async listar(caminho, { limite, cursor, direcao }) {

            const inicio = cursor ?? 0;

            const { data, error } = await supabase
                .from("registros")
                .select("id, dados, criado_em")
                .eq("colecao", caminho)
                .order("criado_em", { ascending: direcao === "asc" })
                .range(inicio, inicio + limite - 1);

            if (error) throw error;

            return {
                itens: data.map((linha) => ({
                    ...linha.dados,
                    id: linha.id,
                    criadoEm: new Date(linha.criado_em)
                })),
                cursor: data.length === limite ? inicio + limite : null
            };
        },


        async criar(caminho, dados) {

            const { data, error } = await supabase
                .from("registros")
                .insert({
                    colecao: caminho,
                    dados,
                    autor_uid: dados.autorUid
                })
                .select("id")
                .single();

            if (error) throw error;

            return data.id;
        },


        async excluir(caminho, id) {

            const { error } = await supabase
                .from("registros")
                .delete()
                .eq("colecao", caminho)
                .eq("id", id);

            if (error) throw error;
        }
    };
}
