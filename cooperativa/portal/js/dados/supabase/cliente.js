/* ============================================================
   COJURIS — CLIENTE SUPABASE COMPARTILHADO

   O login continua no Firebase. O Supabase aceita o token
   do Firebase como identidade ("Third-Party Auth"), então
   o mesmo usuário é reconhecido nos dois serviços.

   Configuração no painel do Supabase:
   Authentication → Sign In / Providers → Third-Party Auth
   → Firebase → informe o ID do projeto: cojuris
   ============================================================ */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import { auth } from "../../firebase-config.js";


let cliente = null;

export function obterCliente(config) {

    if (cliente) {
        return cliente;
    }

    const { url, chaveAnonima } = config.supabase || {};

    if (!url || !chaveAnonima) {
        throw new Error(
            "Supabase selecionado, mas url e chaveAnonima não foram preenchidas em dados/config.js."
        );
    }

    cliente = createClient(url, chaveAnonima, {
        accessToken: async () =>
            (await auth.currentUser?.getIdToken()) ?? null
    });

    return cliente;
}
