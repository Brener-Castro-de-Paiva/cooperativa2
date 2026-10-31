/* ============================================================
   COJURIS — PROVEDOR LOCAL (DEMONSTRAÇÃO): BANCO

   Guarda os registros no localStorage do navegador.
   Implementa o mesmo contrato dos adaptadores reais e serve
   também como exemplo mínimo para criar um novo provedor.
   ============================================================ */

const CHAVE = "cojuris-demo-banco";

const PERFIS = {
    administradores: { "demo-admin": { ativo: true } },
    interessados: {
        "demo-cooperado": {
            nome: "Ana Ribeiro", email: "ana@demo.local",
            status: "aprovado", verificacaoProfissional: "verificada"
        },
        "demo-leitor": {
            nome: "Bruno Lima", email: "bruno@demo.local",
            status: "pendente", verificacaoProfissional: "nao_verificada"
        }
    }
};


function ler() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE)) || {};
    } catch {
        return {};
    }
}

function gravar(tudo) {
    localStorage.setItem(CHAVE, JSON.stringify(tudo));
}


export function criar() {

    return {

        lerAdministrador: async (uid) => PERFIS.administradores[uid] || null,

        lerInteressado: async (uid) => PERFIS.interessados[uid] || null,

        listarInteressados: async () =>
            Object.entries(PERFIS.interessados).map(([uid, d]) => ({
                uid, nome: d.nome, email: d.email, status: d.status
            })),


        async listar(caminho, { limite, cursor, direcao }) {

            const inicio = cursor ?? 0;

            const itens = (ler()[caminho] || [])
                .slice()
                .sort((a, b) => direcao === "asc"
                    ? a.criadoEm - b.criadoEm
                    : b.criadoEm - a.criadoEm);

            const pagina = itens.slice(inicio, inicio + limite);

            return {
                itens: pagina.map((i) => ({ ...i, criadoEm: new Date(i.criadoEm) })),
                cursor: inicio + limite < itens.length ? inicio + limite : null
            };
        },


        async criar(caminho, dados) {

            const tudo = ler();

            const id = Math.random().toString(36).slice(2, 12);

            (tudo[caminho] ||= []).push({ ...dados, id, criadoEm: Date.now() });

            gravar(tudo);

            return id;
        },


        async excluir(caminho, id) {

            const tudo = ler();

            tudo[caminho] = (tudo[caminho] || []).filter((i) => i.id !== id);

            gravar(tudo);
        }
    };
}
