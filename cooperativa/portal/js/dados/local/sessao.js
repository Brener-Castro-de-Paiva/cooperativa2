/* ============================================================
   COJURIS — PROVEDOR LOCAL (DEMONSTRAÇÃO): SESSÃO

   Só é carregado em localhost com ?modo=demo.
   Escolha o usuário fictício com &usuario=admin,
   &usuario=cooperado (padrão) ou &usuario=leitor.
   ============================================================ */

export const USUARIOS_DEMO = {
    admin:     { uid: "demo-admin",     email: "admin@demo.local" },
    cooperado: { uid: "demo-cooperado", email: "ana@demo.local" },
    leitor:    { uid: "demo-leitor",    email: "bruno@demo.local" }
};


export function criar() {

    const escolha = new URLSearchParams(location.search).get("usuario");

    const usuario = USUARIOS_DEMO[escolha] || USUARIOS_DEMO.cooperado;

    return {
        observar(aoMudar) {
            setTimeout(() => aoMudar(usuario), 0);
            return () => {};
        },
        atual: () => usuario,
        obterToken: () => null,
        sair: async () => { location.href = "./painel.html"; }
    };
}
