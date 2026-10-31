/* ============================================================
   COJURIS — CAMADA DE DADOS (FACHADA)

   ARQUIVO: portal/js/dados/index.js

   As telas do portal conversam SOMENTE com este arquivo.
   Ele não sabe se os dados estão no Firebase, no Supabase
   ou em outro lugar: quem sabe são os adaptadores.

   Para integrar um novo banco:
   1. Crie portal/js/dados/<nome>/ com banco.js e/ou arquivos.js
      seguindo o contrato descrito em docs/arquitetura.md.
   2. Registre-o em PROVEDORES, abaixo.
   3. Aponte o encaixe desejado em config.js.

   Nenhuma tela precisa ser alterada.

   01 — Provedores disponíveis
   02 — Inicialização
   03 — Perfil de acesso
   04 — Comentários
   05 — Mural
   06 — Documentos
   07 — Validações
   ============================================================ */

import { CONFIG, modoDemonstracao } from "./config.js";


// ============================================================
// 01 — PROVEDORES
//
// Carregados sob demanda: o navegador só baixa o código
// do provedor que estiver em uso.
// ============================================================

const PROVEDORES = {

    sessao: {
        firebase: () => import("./firebase/sessao.js"),
        local:    () => import("./local/sessao.js")
    },

    banco: {
        firebase: () => import("./firebase/banco.js"),
        supabase: () => import("./supabase/banco.js"),
        local:    () => import("./local/banco.js")
    },

    arquivos: {
        firebase: () => import("./firebase/arquivos.js"),
        supabase: () => import("./supabase/arquivos.js"),
        local:    () => import("./local/arquivos.js")
    }
};


// ============================================================
// 02 — INICIALIZAÇÃO (uma única vez por página)
// ============================================================

let instancia = null;

export function obterDados() {

    if (!instancia) {
        instancia = montar();
    }

    return instancia;
}


async function carregar(encaixe) {

    const nome = modoDemonstracao()
        ? "local"
        : CONFIG[encaixe];

    const fabrica = PROVEDORES[encaixe][nome];

    if (!fabrica) {
        throw new Error(
            `Provedor "${nome}" não registrado para "${encaixe}".`
        );
    }

    const modulo = await fabrica();

    return modulo.criar(CONFIG);
}


async function montar() {

    const [sessao, banco, arquivos] = await Promise.all([
        carregar("sessao"),
        carregar("banco"),
        carregar("arquivos")
    ]);

    return {
        sessao,
        perfil: (usuario) => consultarPerfil(banco, usuario),
        cooperados: {
            listar: () => banco.listarInteressados()
        },
        comentarios: comentarios(banco),
        mural: mural(banco),
        documentos: documentos(banco, arquivos),
        demonstracao: modoDemonstracao()
    };
}


// ============================================================
// 03 — PERFIL DE ACESSO
//
// Mesma classificação já usada em comunicados.js
// e comunidade.js:
//
// administrador — administradores/{uid} com ativo = true
// participante  — aprovado e verificado
// leitor        — pendente ou aprovado sem verificação
// rejeitado / sem_cadastro / sem_permissao
// ============================================================

const NOME_ADMINISTRACAO = "Administração COJURIS";

async function consultarPerfil(banco, usuario) {

    if (!usuario) {
        return { perfil: "sem_sessao", nome: "" };
    }

    const admin = await banco.lerAdministrador(usuario.uid);

    if (admin?.ativo === true) {
        return { perfil: "administrador", nome: NOME_ADMINISTRACAO };
    }

    const dados = await banco.lerInteressado(usuario.uid);

    if (!dados) {
        return { perfil: "sem_cadastro", nome: "" };
    }

    const nome = dados.nome || usuario.email || "Cooperado";

    if (dados.status === "rejeitado") {
        return { perfil: "rejeitado", nome };
    }

    if (
        dados.status === "aprovado" &&
        dados.verificacaoProfissional === "verificada"
    ) {
        return { perfil: "participante", nome };
    }

    if (dados.status === "pendente" || dados.status === "aprovado") {
        return { perfil: "leitor", nome };
    }

    return { perfil: "sem_permissao", nome };
}


// Quem pode fazer o quê. As telas consultam estas funções
// em vez de repetir as regras.

export const permissoes = {

    ler: (p) =>
        ["administrador", "participante", "leitor"].includes(p),

    participar: (p) =>
        ["administrador", "participante"].includes(p),

    administrar: (p) => p === "administrador",

    excluirItem: (p, uid, item) =>
        p === "administrador" || item?.autorUid === uid
};


// ============================================================
// 04 — COMENTÁRIOS
//
// "alvo" identifica o que está sendo comentado:
// "comunicados/<id>" ou "mural/<id>".
// ============================================================

function comentarios(banco) {

    const caminho = (alvo) => {
        validarAlvo(alvo);
        return `${alvo}/comentarios`;
    };

    return {

        listar: (alvo, opcoes = {}) =>
            banco.listar(caminho(alvo), {
                limite: opcoes.limite ?? 20,
                cursor: opcoes.cursor ?? null,
                direcao: "asc"
            }),

        criar: (alvo, texto, autor) =>
            banco.criar(caminho(alvo), {
                texto: validarTexto(texto, 1, 2000),
                autorUid: autor.uid,
                autorNome: autor.nome
            }),

        excluir: (alvo, id) =>
            banco.excluir(caminho(alvo), id)
    };
}


// ============================================================
// 05 — MURAL DA COMUNIDADE
// ============================================================

function mural(banco) {

    return {

        listar: (opcoes = {}) =>
            banco.listar("mural", {
                limite: opcoes.limite ?? 10,
                cursor: opcoes.cursor ?? null,
                direcao: "desc"
            }),

        publicar: (texto, autor) =>
            banco.criar("mural", {
                texto: validarTexto(texto, 3, 5000),
                autorUid: autor.uid,
                autorNome: autor.nome
            }),

        excluir: (id) => banco.excluir("mural", id)
    };
}


// ============================================================
// 06 — DOCUMENTOS
//
// pasta = { tipo: "pessoal", uid }  → pasta do cooperado
// pasta = { tipo: "biblioteca" }    → materiais publicados
// ============================================================

function colecaoDaPasta(pasta) {

    if (pasta?.tipo === "biblioteca") {
        return "biblioteca";
    }

    if (pasta?.tipo === "pessoal" && pasta.uid) {
        return `documentos_pessoais/${pasta.uid}/itens`;
    }

    throw new Error("Pasta de documentos inválida.");
}


function prefixoDaPasta(pasta) {

    return pasta.tipo === "biblioteca"
        ? "biblioteca"
        : `pessoais/${pasta.uid}`;
}


function documentos(banco, arquivos) {

    return {

        listar: (pasta, opcoes = {}) =>
            banco.listar(colecaoDaPasta(pasta), {
                limite: opcoes.limite ?? 50,
                cursor: opcoes.cursor ?? null,
                direcao: "desc"
            }),


        // Envia o arquivo e depois registra os dados dele.
        // Se o registro falhar, o arquivo enviado é removido
        // para não deixar sobras no armazenamento.

        async enviar(pasta, arquivo, detalhes, autor, aoProgredir) {

            const colecao = colecaoDaPasta(pasta);

            validarArquivo(arquivo, pasta);

            const titulo = validarTexto(
                detalhes?.titulo || arquivo.name, 1, 150
            );

            const descricao = (detalhes?.descricao || "")
                .trim()
                .slice(0, 500);

            const caminho =
                `${prefixoDaPasta(pasta)}/${Date.now()}-${nomeSeguro(arquivo.name)}`;

            await arquivos.enviar(caminho, arquivo, aoProgredir);

            try {

                return await banco.criar(colecao, {
                    titulo,
                    descricao,
                    nomeArquivo: arquivo.name,
                    tipo: arquivo.type || "application/octet-stream",
                    tamanho: arquivo.size,
                    caminho,
                    autorUid: autor.uid,
                    autorNome: autor.nome
                });

            } catch (erro) {

                await arquivos.excluir(caminho).catch(() => {});

                throw erro;
            }
        },


        link: (item) => arquivos.obterLink(item.caminho, item.nomeArquivo),


        // Remove o registro primeiro: se o arquivo não puder
        // ser apagado, ele apenas deixa de aparecer.

        async excluir(pasta, item) {

            await banco.excluir(colecaoDaPasta(pasta), item.id);

            await arquivos.excluir(item.caminho).catch((erro) => {
                console.warn("Arquivo não removido:", erro);
            });
        }
    };
}


// ============================================================
// 07 — VALIDAÇÕES
// ============================================================

function validarTexto(texto, minimo, maximo) {

    const limpo = String(texto ?? "").trim();

    if (limpo.length < minimo) {
        throw new ErroDeValidacao(
            minimo <= 1
                ? "Escreva algo antes de enviar."
                : `O texto precisa ter pelo menos ${minimo} caracteres.`
        );
    }

    if (limpo.length > maximo) {
        throw new ErroDeValidacao(
            `O texto pode ter no máximo ${maximo} caracteres.`
        );
    }

    return limpo;
}


function validarAlvo(alvo) {

    if (!/^(comunicados|mural)\/[A-Za-z0-9_-]+$/.test(alvo)) {
        throw new Error("Destino de comentário inválido.");
    }
}


function validarArquivo(arquivo, pasta) {

    if (!arquivo || !arquivo.size) {
        throw new ErroDeValidacao("Selecione um arquivo.");
    }

    const limiteMB = pasta.tipo === "biblioteca"
        ? CONFIG.limites.bibliotecaMB
        : CONFIG.limites.pessoalMB;

    if (arquivo.size > limiteMB * 1024 * 1024) {
        throw new ErroDeValidacao(
            `O arquivo passa de ${limiteMB} MB.`
        );
    }

    const extensao = (arquivo.name.match(/\.[^.]+$/)?.[0] || "")
        .toLowerCase();

    const tipoOk = CONFIG.tiposAceitos.includes(arquivo.type);
    const extensaoOk = CONFIG.extensoesAceitas.includes(extensao);

    if (!tipoOk && !extensaoOk) {
        throw new ErroDeValidacao(
            "Tipo de arquivo não aceito. Use PDF, Word, Excel, ODT, JPG, PNG ou TXT."
        );
    }
}


export function nomeSeguro(nome) {

    const base = String(nome || "arquivo")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-.]+/, "");

    return (base || "arquivo").slice(-120);
}


export class ErroDeValidacao extends Error {}


// Converte erros técnicos em mensagens para o usuário.

export function mensagemDeErro(erro) {

    if (erro instanceof ErroDeValidacao) {
        return erro.message;
    }

    const codigo = String(erro?.code || erro?.message || "");

    if (/permission|unauthorized|403|42501/i.test(codigo)) {
        return "Você não tem permissão para esta ação.";
    }

    if (/quota|limit/i.test(codigo)) {
        return "Limite de armazenamento atingido. Tente mais tarde.";
    }

    if (/network|unavailable|failed to fetch/i.test(codigo)) {
        return "Falha de conexão. Verifique a internet e tente de novo.";
    }

    console.error(erro);

    return "Não foi possível concluir. Tente novamente.";
}
