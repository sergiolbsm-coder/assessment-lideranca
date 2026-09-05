# Entrevista de Alto Impacto

Simulador de entrevista de emprego. Idealizadora: **Franciane Novais** — venture
desenvolvida em parceria com o Instituto da Liderança.

Site estático (sem login) + Google Sheets/Apps Script como backend, porque o
público (candidatos de vaga) não tem conta Google/Claude — diferente dos
outros instrumentos deste repositório, que rodam para participantes já
identificados.

## Páginas

| Papel | Arquivo | O que faz |
|---|---|---|
| Início | `index.html` | Mini-site: o que é o projeto, como funciona, os 3 padrões de resposta, e a seção sobre a idealizadora |
| Candidato | `responder.html` | Inicia/retoma uma simulação, responde pergunta a pergunta, vê orientação + feedback da IA ao final |
| Especialista | `especialista.html` | Lista simulações enviadas, escreve feedback personalizado por pergunta |
| Relatório | `relatorio.html` | Relatório completo e imprimível (pergunta, resposta, orientação, feedback IA + especialista) |
| Parametrização | `admin.html` | Cadastra perguntas, define o padrão de resposta (Direta / Reflexiva / Método STAR), a orientação e o critério da IA |

A seção "sobre a idealizadora" em `index.html` está com texto genérico de missão/propósito
(não inventei formação, cargos ou trajetória da Franciane) — trocar pelo texto real quando
disponível.

Links depois de publicado (domínio já configurado via CNAME do repositório):
`https://assessment.institutodalideranca.com.br/ventures/entrevista-de-alto-impacto/`

## Arquivos compartilhados
- `app.css` — design system IDL (tokens, componentes).
- `app.js` — utilitários, cliente da API (`Api.*`), banco de 44 perguntas de exemplo (`SEED_QUESTIONS`).
- `logo.svg` — marca própria da venture (não é a logo do Instituto).
- `franciane-novais.jpg` — foto da idealizadora, usada no cabeçalho e no relatório.

## Backend

Veja `../../APPS_SCRIPT_ENTREVISTA_ALTO_IMPACTO.gs` (raiz do repositório) para
o código completo e o passo a passo de implantação no Google Apps Script.

**Pendência para ativar de vez:** colar a URL `/exec` da implantação na
constante `API_URL` no topo de `app.js`, e commitar de novo. Até lá, as 4
páginas mostram o aviso "Backend ainda não configurado".

Depois de configurado, abra `admin.html` e clique em **"Carregar banco de
exemplo (44 perguntas)"** para popular a planilha com o banco inicial (10
delas já ativas, formando uma primeira simulação equilibrada entre os 3
padrões de resposta).
