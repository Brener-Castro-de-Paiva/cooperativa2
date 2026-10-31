/* ============================================================
   COJURIS — CONFIGURAÇÃO DA CAMADA DE DADOS

   ARQUIVO: portal/js/dados/config.js

   Este é o ÚNICO arquivo que precisa mudar para trocar
   onde os dados ou os arquivos ficam guardados.

   Há três "encaixes" independentes:

   sessao   — quem está conectado (login)
   banco    — registros: comentários, mural, documentos
   arquivos — os arquivos enviados (PDF, imagens etc.)

   Provedores disponíveis em cada encaixe:

   sessao:   "firebase"
   banco:    "firebase" | "supabase"
   arquivos: "firebase" | "supabase"

   Exemplo — manter o login e os registros no Firebase
   e guardar os arquivos no Supabase:

   banco: "firebase",
   arquivos: "supabase"

   MODO DE DEMONSTRAÇÃO
   Ao abrir o portal em localhost com ?modo=demo no endereço,
   todos os encaixes usam o provedor "local", que guarda tudo
   no próprio navegador. Serve apenas para testar telas.
   Ele NÃO funciona no site publicado.
   ============================================================ */

export const CONFIG = {

    sessao: "firebase",

    banco: "firebase",

    arquivos: "firebase",


    // Preencha somente se for usar o Supabase.
    // Veja docs/supabase.sql para criar as tabelas.

    supabase: {
        url: "",
        chaveAnonima: "",
        bucket: "documentos"
    },


    // Limites de envio (em megabytes).

    limites: {
        pessoalMB: 10,
        bibliotecaMB: 25
    },


    // Tipos de arquivo aceitos.

    tiposAceitos: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.oasis.opendocument.text",
        "image/jpeg",
        "image/png",
        "text/plain"
    ],

    extensoesAceitas: [
        ".pdf", ".doc", ".docx", ".xls", ".xlsx",
        ".odt", ".jpg", ".jpeg", ".png", ".txt"
    ]
};


// ------------------------------------------------------------
// Ativa o modo de demonstração somente em ambiente local.
// ------------------------------------------------------------

export function modoDemonstracao() {

    const local = ["localhost", "127.0.0.1"]
        .includes(location.hostname);

    const pedido = new URLSearchParams(location.search)
        .get("modo") === "demo";

    return local && pedido;
}
