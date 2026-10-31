/* ============================================================
   COJURIS — MURAL DA COMUNIDADE

   ARQUIVO: portal/js/mural.js

   01 — Inicialização
   02 — Cartão de publicação
   03 — Listagem paginada
   04 — Publicação

   Ler: todos com acesso ao portal.
   Publicar e comentar: profissionais verificados e administração.
   Excluir: autor ou administração.
   ============================================================ */

import { permissoes, mensagemDeErro } from "./dados/index.js";
import { el, botao, formatarData, iniciais, iniciarPagina } from "./recursos/ui.js";
import { criarAreaComentarios } from "./recursos/comentarios.js";


const lista = document.getElementById("lista-mural");
const mensagem = document.getElementById("mensagem-lista");
const btnMais = document.getElementById("btn-mais");
const btnAtualizar = document.getElementById("btn-atualizar");
const form = document.getElementById("form-mural");
const campo = document.getElementById("texto-mural");
const btnPublicar = document.getElementById("btn-publicar");

let ctx = null;
let cursor = null;
let carregando = false;


// ============================================================
// 01 — INICIALIZAÇÃO
// ============================================================

iniciarPagina(async (contexto) => {

    ctx = contexto;

    const participa = permissoes.participar(ctx.perfil);

    document.getElementById("area-publicar").hidden = !participa;

    document.getElementById("aviso-leitura").hidden = participa;

    await carregar(true);
});


// ============================================================
// 02 — CARTÃO DE PUBLICAÇÃO
// ============================================================

function criarCartao(p) {

    const cartao = el("article", "cartao-comunicado cj-publicacao");

    cartao.dataset.id = p.id;

    const cabecalho = el("div", "cartao-cabecalho");

    const autor = el("div", "cartao-identificacao");

    const avatar = el("span", "cj-avatar", iniciais(p.autorNome));

    avatar.setAttribute("aria-hidden", "true");

    autor.append(avatar, el("strong", "", p.autorNome || "Cooperado"));

    const data = el("time", "data-publicacao", formatarData(p.criadoEm));

    if (p.criadoEm) data.dateTime = p.criadoEm.toISOString();

    cabecalho.append(autor, data);

    cartao.append(
        cabecalho,
        el("p", "conteudo-comunicado", p.texto)
    );

    if (permissoes.excluirItem(ctx.perfil, ctx.usuario.uid, p)) {

        const acoes = el("div", "acoes-comunicado");

        const excluir = botao("Excluir publicação", "botao-excluir", async () => {

            if (!confirm("Excluir esta publicação?")) return;

            excluir.disabled = true;

            try {
                await ctx.dados.mural.excluir(p.id);
                cartao.remove();
                if (!lista.children.length) {
                    mensagem.textContent = "Nenhuma publicação ainda.";
                }
            } catch (erro) {
                excluir.disabled = false;
                mensagem.textContent = mensagemDeErro(erro);
            }
        });

        acoes.append(excluir);

        cartao.append(acoes);
    }

    cartao.append(criarAreaComentarios(`mural/${p.id}`));

    return cartao;
}


// ============================================================
// 03 — LISTAGEM PAGINADA
// ============================================================

async function carregar(reiniciar) {

    if (carregando) return;

    carregando = true;

    btnMais.disabled = true;

    btnAtualizar.disabled = true;

    if (reiniciar) {
        cursor = null;
        lista.replaceChildren();
    }

    mensagem.textContent = "Carregando publicações...";

    try {

        const pagina = await ctx.dados.mural.listar({ cursor });

        pagina.itens.forEach((p) => lista.append(criarCartao(p)));

        cursor = pagina.cursor;

        btnMais.hidden = !cursor;

        mensagem.textContent = lista.children.length
            ? ""
            : "Nenhuma publicação ainda. Que tal começar a conversa?";

    } catch (erro) {
        mensagem.textContent = mensagemDeErro(erro);
    } finally {
        carregando = false;
        btnMais.disabled = false;
        btnAtualizar.disabled = false;
    }
}

btnMais.addEventListener("click", () => carregar(false));

btnAtualizar.addEventListener("click", () => carregar(true));


// ============================================================
// 04 — PUBLICAÇÃO
// ============================================================

form.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    if (btnPublicar.disabled || !ctx) return;

    btnPublicar.disabled = true;

    btnPublicar.textContent = "Publicando...";

    try {

        const texto = campo.value;

        const id = await ctx.dados.mural.publicar(texto, {
            uid: ctx.usuario.uid,
            nome: ctx.nome
        });

        lista.prepend(criarCartao({
            id,
            texto: texto.trim(),
            autorUid: ctx.usuario.uid,
            autorNome: ctx.nome,
            criadoEm: new Date()
        }));

        form.reset();

        mensagem.textContent = "Publicação enviada.";

    } catch (erro) {
        mensagem.textContent = mensagemDeErro(erro);
    } finally {
        btnPublicar.disabled = false;
        btnPublicar.textContent = "Publicar";
    }
});
