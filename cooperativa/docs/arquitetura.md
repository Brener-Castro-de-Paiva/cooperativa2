# COJURIS — Arquitetura do portal

## Visão geral

O portal é um site estático (HTML, CSS e JavaScript puro) publicado no GitHub Pages. O login e os dados usam o Firebase (Authentication, Firestore e Storage).

```
index.html                 Página institucional
portal/
  index.html               Entrada (login)
  cadastro.html            Cadastro de interessados
  painel.html              Painel do cooperado
  comunidade.html          Área comum (comunicados + navegação)
  comunicados.html         Comunicados oficiais (admin publica)
  mural.html               NOVO — mural livre entre cooperados
  documentos.html          NOVO — pasta pessoal e biblioteca
  admin.html               Aprovação de cadastros
  js/
    firebase-config.js     Inicialização do Firebase
    dados/                 NOVO — camada de dados (ver abaixo)
    recursos/              NOVO — componentes reutilizáveis
      ui.js                Criação segura de elementos, acesso às páginas
      comentarios.js       Área de comentários de qualquer cartão
regras/                    NOVO — regras de segurança sugeridas
docs/supabase.sql          NOVO — estrutura para o Supabase
```

## Perfis de acesso

| Perfil | Como é definido | Pode |
|---|---|---|
| Administração | `administradores/{uid}` com `ativo: true` | Tudo, inclusive ver as pastas de todos e publicar na biblioteca |
| Participante | `interessados/{uid}` aprovado e verificado | Ler, publicar no mural, comentar, usar a própria pasta |
| Leitor | `interessados/{uid}` pendente ou aprovado sem verificação | Ler e usar a própria pasta (por exemplo, para enviar documentos de verificação) |

Quem exclui: o autor do item ou a administração.

## Camada de dados

As telas novas não falam diretamente com o Firebase. Elas chamam `portal/js/dados/index.js` (a "fachada"), que repassa o pedido ao provedor configurado em `portal/js/dados/config.js`.

```
Telas ──► dados/index.js ──► provedor de sessão   (firebase | local)
                          ├─► provedor de banco    (firebase | supabase | local)
                          └─► provedor de arquivos (firebase | supabase | local)
```

Os três encaixes são independentes. É possível, por exemplo, manter login e registros no Firebase e guardar os arquivos no Supabase mudando uma única linha em `config.js`.

As páginas que já existiam continuam usando o Firestore diretamente. Elas só ganharam a área de comentários, que passa pela fachada.

### Contrato de um provedor

Cada provedor é um módulo que exporta `criar(config)` e devolve um objeto com estas funções. Todas retornam Promises, exceto `observar` e `atual`.

**Sessão**

| Função | Retorno |
|---|---|
| `observar(aoMudar)` | Chama `aoMudar({ uid, email } \| null)` a cada mudança; devolve função para cancelar |
| `atual()` | `{ uid, email }` ou `null` |
| `obterToken()` | Token do usuário (para provedores externos) |
| `sair()` | — |

**Banco**

| Função | Retorno |
|---|---|
| `lerAdministrador(uid)` | `{ ativo }` ou `null` |
| `lerInteressado(uid)` | `{ nome, email, status, verificacaoProfissional }` ou `null` |
| `listarInteressados()` | `[{ uid, nome, email, status }]` |
| `listar(caminho, { limite, cursor, direcao })` | `{ itens: [{ id, criadoEm: Date, ... }], cursor }`. `cursor` é opaco; `null` quando não há mais páginas |
| `criar(caminho, dados)` | `id` do novo registro. O provedor grava `criadoEm` |
| `excluir(caminho, id)` | — |

`caminho` segue o formato do Firestore: `mural`, `mural/<id>/comentarios`, `comunicados/<id>/comentarios`, `documentos_pessoais/<uid>/itens`, `biblioteca`.

**Arquivos**

| Função | Retorno |
|---|---|
| `enviar(caminho, arquivo, aoProgredir)` | `caminho`. `aoProgredir` recebe de 0 a 1 |
| `obterLink(caminho, nomeArquivo)` | URL para download |
| `excluir(caminho)` | — |

O provedor `local` (pasta `dados/local/`) é a implementação mais curta do contrato e serve de modelo para criar um novo.

### Integrar outro banco (ex.: MySQL via API própria)

1. Crie `portal/js/dados/meubanco/banco.js` exportando `criar(config)` com as funções da tabela "Banco".
2. Registre-o em `PROVEDORES.banco` no topo de `dados/index.js`.
3. Em `config.js`, troque `banco: "firebase"` por `banco: "meubanco"`.

Nenhuma tela precisa mudar.

## Estrutura dos dados novos (Firestore)

```
comunicados/{id}/comentarios/{id}   texto, autorUid, autorNome, criadoEm
mural/{id}                          texto, autorUid, autorNome, criadoEm
mural/{id}/comentarios/{id}         texto, autorUid, autorNome, criadoEm
documentos_pessoais/{uid}/itens/{id} titulo, descricao, nomeArquivo, tipo,
                                    tamanho, caminho, autorUid, autorNome, criadoEm
biblioteca/{id}                     (mesmos campos de documentos)
```

Arquivos no Storage: `pessoais/{uid}/<data>-<nome>` e `biblioteca/<data>-<nome>`.

## Colocar no ar

1. **Firestore**: cole o conteúdo de `regras/firestore-novos-recursos.rules` dentro das regras atuais e publique.
2. **Storage**: ative em Console → Storage (projetos novos exigem o plano Blaze, com cota gratuita). Depois publique `regras/storage.rules`.
3. Envie os arquivos ao repositório. O GitHub Pages publica sozinho.

### Usar o Supabase (opcional)

1. Siga as instruções no topo de `docs/supabase.sql`.
2. O Supabase só aceita tokens do Firebase que tenham a declaração `role: "authenticated"`. Ela precisa ser adicionada aos usuários (Admin SDK `setCustomUserClaims` ou função de bloqueio do Identity Platform). Consulte a documentação "Third-Party Auth → Firebase" do Supabase.
3. Em `config.js`, preencha `supabase.url` e `supabase.chaveAnonima` e troque o encaixe desejado.

## Testar sem Firebase (modo de demonstração)

Sirva a pasta do projeto localmente e abra, por exemplo:

```
python3 -m http.server 8000
http://localhost:8000/portal/documentos.html?modo=demo&usuario=admin
http://localhost:8000/portal/mural.html?modo=demo&usuario=cooperado
http://localhost:8000/portal/mural.html?modo=demo&usuario=leitor
```

Tudo fica salvo apenas no navegador. O modo não funciona fora de `localhost`.

## Pontos para a etapa de segurança

- As regras novas confiam em `interessados/{uid}.status`. É preciso garantir que o usuário não consiga alterar o próprio `status` ou `verificacaoProfissional`.
- `autorNome` é informado pelo navegador. Para impedir nomes falsos, valide-o nas regras contra `interessados/{uid}.nome`.
- No Firebase Storage, o link de download contém um token: quem tiver o link consegue baixar. No Supabase, os links expiram em 1 hora.
- O cadastro ainda não confere o número da OAB.
