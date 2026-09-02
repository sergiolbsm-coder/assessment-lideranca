# Plano de Construção — Assessment de Carreira em RH

## 1. Visão do produto

Construir um assessment digital, executável e evolutivo, que identifique a aderência de uma pessoa às principais subáreas de Recursos Humanos. O produto reutilizará componentes do Assessment de Liderança do Instituto da Liderança e acrescentará perguntas específicas do contexto de RH.

O resultado não deverá definir se a pessoa “serve” ou “não serve” para uma área. Ele deverá mostrar:

- aderência potencial: interesses, preferências e julgamento compatíveis;
- prontidão atual: conhecimentos e experiências já desenvolvidos;
- evidências que sustentam cada resultado;
- lacunas e recomendações de desenvolvimento;
- nível de confiança da estimativa.

### Público inicial

- estudantes e profissionais considerando ingressar em RH;
- profissionais de RH escolhendo uma especialização;
- profissionais em transição entre subáreas de RH;
- empresas interessadas em mobilidade interna e desenvolvimento.

### Subáreas avaliadas na versão 1

1. Recrutamento e Seleção / Talent Acquisition
2. Recruiter Tech
3. DHO / Treinamento e Desenvolvimento
4. HR Business Partner
5. RH Generalista
6. People Analytics
7. Remuneração e Benefícios
8. Departamento Pessoal / Relações Trabalhistas
9. Employer Branding / Employee Experience

## 2. Princípios do assessment

1. **Multimétodo:** nenhuma conclusão será baseada apenas em personalidade.
2. **Transparência:** o relatório explicará os fatores que elevaram ou reduziram cada resultado.
3. **Potencial separado de experiência:** falta de experiência reduzirá prontidão, não necessariamente potencial.
4. **Sem exclusão automática:** nenhum perfil DISC será considerado impeditivo.
5. **Percentual como índice:** aderência não será apresentada como probabilidade de sucesso.
6. **Recalibração:** pesos e perfis de referência deverão evoluir com dados reais.
7. **Linguagem responsável:** evitar diagnósticos psicológicos e promessas de validade ainda não demonstradas.

## 3. Arquitetura do instrumento

### Bloco A — DISC natural

**Objetivo:** identificar preferências de comportamento, tomada de decisão, ritmo, interação e relação com regras.

- Reutilizar a estrutura DISC existente.
- Usar 12 a 16 blocos na versão curta.
- Usar os escores naturais `disc_nat_D`, `disc_nat_I`, `disc_nat_S` e `disc_nat_C` no cálculo de aderência.
- Não utilizar o delta `disc_D/I/S/C` como perfil natural.
- O perfil adaptado/máscara poderá ser opcional para profissionais com experiência.

**Peso inicial:** 20% do índice combinado, equivalente a 25% da aderência potencial quando o bloco de experiência é exibido separadamente.

### Bloco B — Holland RIASEC

**Objetivo:** mapear interesses ocupacionais nas dimensões Realista, Investigativo, Artístico, Social, Empreendedor e Convencional.

- Reutilizar as questões e escores Holland existentes.
- Selecionar 18 a 24 itens com maior relação com o contexto profissional.
- Manter os seis escores, sem reduzir antecipadamente a pessoa a um único código.

**Peso inicial:** 25% do índice combinado, equivalente a 31,25% da aderência potencial quando o bloco de experiência é exibido separadamente.

### Bloco C — Situações práticas de RH

**Objetivo:** avaliar julgamento situacional, preferência de atuação e resposta a problemas reais de RH.

- Criar 12 a 16 cenários.
- Cada cenário terá quatro alternativas plausíveis.
- Evitar alternativas obviamente certas ou erradas.
- Cada alternativa poderá contribuir para mais de uma subárea, com pesos diferentes.
- Cobrir problemas de recrutamento, desenvolvimento, indicadores, legislação, remuneração, experiência do colaborador e consultoria interna.

**Peso inicial:** 35% do índice combinado, equivalente a 43,75% da aderência potencial quando o bloco de experiência é exibido separadamente.

### Bloco D — Experiência e conhecimentos

**Objetivo:** estimar prontidão atual sem confundi-la com potencial.

- Criar 8 a 12 perguntas.
- Perguntar sobre atividades efetivamente realizadas, frequência, autonomia, complexidade e evidências.
- Incluir opções para experiência acadêmica, voluntária, projetos e atuação transferível.
- Evitar premiar apenas tempo de carreira.
- Incluir autopercepção de conhecimento, mas diferenciá-la de evidência prática.

**Uso:** compor o índice separado de prontidão atual.

## 4. Modelo de resultados

### 4.1 Aderência potencial

Para cada subárea `s`, os pesos comportamentais originalmente definidos (20/25/35) são renormalizados dentro dos 80 pontos de potencial:

```text
Potencial(s) = 0,2500 × DISC(s)
             + 0,3125 × Holland(s)
             + 0,4375 × Situações(s)
```

Assim, potencial não é reduzido pela falta de experiência. Se o produto precisar de uma visualização combinada, ela poderá ser calculada como `0,80 × Potencial + 0,20 × Prontidão`, sempre mantendo os dois índices originais visíveis.

### 4.2 Prontidão atual

```text
Prontidão(s) = Evidência prática(s) × 0,60
              + Conhecimento(s)       × 0,25
              + Autonomia(s)          × 0,15
```

### 4.3 Faixas de interpretação provisórias

- 80–100: forte aderência indicativa;
- 65–79: boa aderência indicativa;
- 50–64: aderência moderada, recomendada exploração;
- abaixo de 50: menor evidência no instrumento atual, sem caráter impeditivo.

Essas faixas são hipóteses de produto e deverão ser recalibradas após o piloto.

### 4.4 Confiança do resultado

O sistema calculará um indicador separado:

- **alta:** instrumento completo, respostas consistentes e diferenças claras entre as primeiras colocações;
- **moderada:** instrumento completo, mas resultados próximos ou pouca evidência de experiência;
- **baixa:** respostas incompletas, inconsistentes ou insuficientes.

## 5. Matriz de perfis de referência

Criar uma matriz configurável em JSON, separada da interface. Cada subárea conterá:

- vetor-alvo DISC;
- vetor-alvo Holland;
- pesos das alternativas situacionais;
- categorias de experiência e conhecimento;
- competências características;
- mensagens de forças, pontos de atenção e desenvolvimento.

Exemplo estrutural:

```json
{
  "recruiter_tech": {
    "nome": "Recruiter Tech",
    "disc": { "D": 0.20, "I": 0.30, "S": 0.15, "C": 0.35 },
    "holland": { "R": 0.05, "I": 0.30, "A": 0.05, "S": 0.20, "E": 0.25, "C": 0.15 },
    "competencias": ["sourcing", "comunicação", "investigação", "tecnologia"]
  }
}
```

Os valores acima são apenas exemplo técnico, não a matriz final.

## 6. Experiência de uso no Claude

### Fluxo conversacional

1. Claude apresenta objetivo, duração e limites do assessment.
2. Usuário informa nome, momento de carreira e consentimento para participar.
3. Claude conduz os quatro blocos, salvando o estado entre as etapas.
4. Claude verifica itens não respondidos e possíveis inconsistências.
5. Um mecanismo determinístico calcula os escores; o modelo de linguagem não inventa percentuais.
6. Claude transforma os escores em devolutiva personalizada, respeitando regras e templates.
7. Usuário pode aprofundar uma subárea e receber um plano de desenvolvimento.

### Regra técnica central

O Claude deverá conduzir e explicar o assessment, mas a pontuação será feita por funções determinísticas e versionadas. Isso permite reproduzir, auditar e recalibrar resultados.

### Formatos de execução

- **Protótipo:** prompt estruturado + arquivo JSON + função local de cálculo.
- **MVP web:** nova jornada dentro de `idl-sistema`, responsiva e independente do assessment completo.
- **Evolução:** skill ou aplicativo integrado ao Claude, com armazenamento consentido e relatório exportável.

## 7. Devolutiva

O relatório deverá apresentar:

1. ranking das nove subáreas;
2. potencial e prontidão em indicadores separados;
3. contribuição de DISC, Holland, situações e experiência;
4. três principais evidências de aderência;
5. pontos de atenção sem linguagem eliminatória;
6. subáreas adjacentes ou combinações possíveis;
7. recomendações de estudo e experiências práticas;
8. explicação de como o percentual foi calculado;
9. aviso de que o instrumento é orientativo.

## 8. Plano de construção

### Fase 0 — Decisões de produto

**Entregáveis**

- nome e posicionamento do produto;
- público prioritário;
- nove subáreas confirmadas;
- definição entre protótipo somente no Claude ou MVP web desde o início;
- termos de uso, consentimento e aviso de limitação.

**Critério de aceite:** escopo aprovado e nenhuma ambiguidade sobre o uso orientativo.

### Fase 1 — Taxonomia e matriz de competências

**Atividades**

- descrever missão, atividades e contexto de cada subárea;
- identificar competências comuns e diferenciadoras;
- mapear DISC e Holland como hipóteses, sem estereótipos eliminatórios;
- entrevistar de 2 a 4 especialistas por subárea, quando possível;
- montar a primeira matriz de perfis de referência.

**Entregáveis:** dicionário de competências e matriz de referência v0.1.

**Critério de aceite:** cada peso possui justificativa documentada.

### Fase 2 — Banco de perguntas

**Atividades**

- selecionar itens DISC e Holland existentes;
- redigir cenários situacionais;
- criar perguntas de experiência, autonomia e conhecimento;
- revisar clareza, neutralidade, acessibilidade e vieses;
- embaralhar itens e alternativas quando isso não prejudicar a escala.

**Entregáveis:** banco versionado, gabarito de pontuação e justificativa por item.

**Critério de aceite:** todos os itens estão ligados a dimensões e subáreas explícitas.

### Fase 3 — Motor de pontuação

**Atividades**

- normalizar escalas para 0–100;
- implementar cálculo de similaridade com os perfis-alvo;
- calcular potencial, prontidão e confiança separadamente;
- criar testes automatizados para casos extremos e empates;
- versionar pesos, itens e algoritmo.

**Entregáveis:** arquivo de configuração, funções de cálculo e testes.

**Critério de aceite:** o mesmo conjunto de respostas sempre produz o mesmo resultado.

### Fase 4 — Protótipo executável no Claude

**Atividades**

- criar prompt de condução;
- implementar controle de estado e retomada;
- conectar respostas ao motor determinístico;
- criar template de devolutiva;
- testar jornadas de iniciante, transição e profissional experiente.

**Entregáveis:** protótipo funcional, instruções de operação e exemplos de relatório.

**Critério de aceite:** uma pessoa conclui sem intervenção manual e entende o resultado.

### Fase 5 — Piloto qualitativo

**Amostra sugerida:** 30 a 60 participantes, buscando diversidade de senioridade e subáreas.

**Avaliar**

- tempo de conclusão;
- taxa de abandono;
- clareza dos itens;
- percepção de utilidade;
- concordância entre resultado, autoidentificação e avaliação de especialistas;
- itens com respostas concentradas ou ambíguas;
- diferenças injustificadas entre grupos.

**Critério de aceite:** nenhum problema crítico de compreensão ou fluxo e evidência inicial de diferenciação entre subáreas.

### Fase 6 — MVP web e dados

**Atividades**

- criar rota/jornada separada no sistema existente;
- persistir respostas, versão do instrumento e resultados;
- criar dashboard administrativo;
- permitir exportação do relatório;
- implementar consentimento, retenção e exclusão de dados;
- observar LGPD, segurança e controle de acesso.

**Critério de aceite:** fluxo responsivo, auditável e sem exposição indevida de dados pessoais.

### Fase 7 — Validação e recalibração

**Atividades**

- ampliar a amostra;
- avaliar consistência dos blocos;
- comparar resultados com indicadores externos pertinentes;
- revisar pesos, faixas e itens;
- documentar limites de validade e população aplicável;
- buscar suporte de profissional de psicometria para afirmações de validade.

**Critério de aceite:** relatório técnico com evidências, limitações e versão recalibrada.

## 9. Cronograma de referência

| Período | Marco |
|---|---|
| Semana 1 | Decisões de produto e taxonomia inicial |
| Semanas 2–3 | Matriz de competências e banco de perguntas |
| Semana 4 | Motor de pontuação e testes |
| Semana 5 | Protótipo no Claude e devolutiva |
| Semanas 6–7 | Piloto qualitativo e ajustes |
| Semanas 8–9 | MVP web, dashboard e privacidade |
| Semana 10+ | Ampliação da amostra e recalibração |

O cronograma pressupõe disponibilidade de especialistas de RH para revisar a matriz e os cenários.

## 10. Papéis recomendados

- responsável de produto/conteúdo de RH;
- especialista em assessment e psicometria;
- especialistas das subáreas avaliadas;
- desenvolvedor responsável pelo motor e interface;
- designer de experiência e devolutiva;
- responsável por privacidade/LGPD.

Uma mesma pessoa pode assumir mais de um papel no protótipo, mas a validação dos itens não deve depender apenas de quem os escreveu.

## 11. Métricas de sucesso

- conclusão em até 18 minutos na versão principal;
- abandono inferior a 20% no piloto;
- pelo menos 80% dos participantes entendem a diferença entre potencial e prontidão;
- pelo menos 75% consideram as recomendações acionáveis;
- estabilidade razoável dos resultados em reaplicação;
- ausência de itens com ambiguidade crítica;
- nenhuma decisão automatizada de contratação baseada apenas no resultado.

## 12. Riscos e controles

| Risco | Controle |
|---|---|
| Percentual parecer probabilidade científica | Explicar metodologia e chamar de índice de aderência |
| DISC dominar o resultado | Limitar peso e combinar com situações e interesses |
| Perfis-alvo refletirem estereótipos | Revisão por especialistas diversos e recalibração com dados |
| Experiência favorecer apenas profissionais seniores | Separar potencial de prontidão e aceitar evidências transferíveis |
| Claude variar a pontuação | Usar motor determinístico e versionado |
| Resultado usado como seleção eliminatória | Termos de uso, avisos e desenho da devolutiva |
| Coleta excessiva de dados pessoais | Minimização, consentimento e política de retenção |

## 13. Backlog inicial

1. Confirmar as nove subáreas da versão 1.
2. Criar fichas de atividades e competências de cada subárea.
3. Definir matriz DISC e Holland v0.1.
4. Selecionar itens existentes que serão reaproveitados.
5. Escrever 16 cenários práticos.
6. Escrever 12 perguntas de experiência e conhecimento.
7. Criar esquema JSON de itens e perfis.
8. Implementar normalização e cálculo.
9. Criar testes de pontuação.
10. Criar prompt operacional do Claude.
11. Criar template de devolutiva.
12. Testar cinco personas sintéticas.
13. Preparar protocolo do piloto.
14. Revisar linguagem, vieses, privacidade e limitações.

## 14. Definição de pronto da versão 1

A versão 1 estará pronta para piloto quando:

- os quatro blocos estiverem completos;
- as nove subáreas tiverem perfis de referência documentados;
- o motor produzir resultados reproduzíveis;
- potencial, prontidão e confiança forem exibidos separadamente;
- a devolutiva explicar evidências e limitações;
- houver testes automatizados dos principais cenários;
- consentimento e tratamento dos dados estiverem definidos;
- o fluxo completo puder ser concluído no Claude sem cálculo manual.

## 15. Status de implementação (MVP web v1)

- **`carreira-rh.html`** publicado — instrumento completo (4 blocos, 14 grupos DISC / 18 itens Holland / 14
  cenários / 9 linhas de experiência), motor de pontuação determinístico e relatório embutido, identidade
  visual IDL (tema claro). Validado localmente: fluxo completo, casos-limite do motor (respostas vazias,
  respostas completas) sem `NaN`, responsividade mobile.
- **Matriz de perfis de referência** (`SUBAREAS` dentro do próprio HTML) é v0.1 — hipóteses de produto,
  ainda sem revisão de especialistas nem recalibração com dados reais (ver §5, §7 desta fase).
- **Persistência:** planilha Google nova e dedicada criada — *"IDL — Diagnóstico de Carreira em RH —
  Respostas"* (`docs.google.com/spreadsheets/d/1whXi5K-NgPfsPJQ_mSUnWmt1F6OKWS-cSTvfogI1mRw`). Script pronto
  em `APPS_SCRIPT_CARREIRA_RH.gs`, isolado do Apps Script de produção — falta apenas a implantação manual
  (passo a passo no topo do arquivo) e colar a URL `/exec` resultante na constante `SHEETS_URL` de
  `carreira-rh.html`. Até lá, o instrumento calcula e mostra o resultado normalmente; só o botão de salvar
  fica inativo.
- **Fora desta v1:** tela de admin para a nova planilha, exportação em PDF dedicada (há impressão via
  navegador), qualquer alteração nos demais assessments do site.
