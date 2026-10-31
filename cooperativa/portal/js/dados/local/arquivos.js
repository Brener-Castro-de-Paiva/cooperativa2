/* ============================================================
   COJURIS — PROVEDOR LOCAL (DEMONSTRAÇÃO): ARQUIVOS

   Guarda os arquivos no IndexedDB do navegador.
   ============================================================ */

const BANCO = "cojuris-demo-arquivos";

function abrir() {

    return new Promise((resolver, rejeitar) => {

        const pedido = indexedDB.open(BANCO, 1);

        pedido.onupgradeneeded = () =>
            pedido.result.createObjectStore("arquivos");

        pedido.onsuccess = () => resolver(pedido.result);
        pedido.onerror = () => rejeitar(pedido.error);
    });
}

async function operar(modo, acao) {

    const banco = await abrir();

    return new Promise((resolver, rejeitar) => {

        const loja = banco
            .transaction("arquivos", modo)
            .objectStore("arquivos");

        const pedido = acao(loja);

        pedido.onsuccess = () => resolver(pedido.result);
        pedido.onerror = () => rejeitar(pedido.error);
    });
}


export function criar() {

    return {

        async enviar(caminho, arquivo, aoProgredir) {
            aoProgredir?.(0.5);
            await operar("readwrite", (l) => l.put(arquivo, caminho));
            aoProgredir?.(1);
            return caminho;
        },

        async obterLink(caminho) {
            const arquivo = await operar("readonly", (l) => l.get(caminho));
            if (!arquivo) throw new Error("Arquivo não encontrado.");
            return URL.createObjectURL(arquivo);
        },

        excluir: (caminho) => operar("readwrite", (l) => l.delete(caminho))
    };
}
