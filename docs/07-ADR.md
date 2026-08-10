# Architecture Decision Records — HomologaPneu

## ADR-001: Separação formal entre HomologaPneu e Intelli Tire

- **Status:** Aceito (2026-08-06)
- **Contexto do produto:** este ADR é específico ao HomologaPneu. O Intelli Tire mantém sua própria cópia deste ADR em `C:\Projetos\intelli-tire-platform\docs\07-ADR.md` — decisão e racional são os mesmos, mas cada produto documenta e versiona de forma independente, por princípio ("Each product must maintain its own documentation. Never share business documentation.").

### Problema

HomologaPneu (homologação de pneus/OEM) e Intelli Tire (BI/Decision Intelligence para distribuidoras de pneus) foram concebidos e desenvolvidos em sessões de trabalho consecutivas, no mesmo período, com o mesmo operador, na mesma vertical de mercado (pneus). Isso cria um risco estrutural real: sem uma fronteira explícita e documentada, decisões de implementação futuras (inclusive por assistentes de IA) podem misturar os dois domínios por proximidade temática — por exemplo, reutilizar uma tabela, uma convenção de autenticação, ou introduzir uma feature de BI dentro do produto de homologação porque "parece relacionado".

Uma auditoria completa do workspace foi realizada em 2026-08-06 (ver `Architecture-Separation-Report.md` da sessão de auditoria) para verificar o estado real antes de formalizar a separação.

### Alternativas consideradas

1. **Monorepo com dois pacotes** — rejeitada. Os dois produtos têm modelos de autenticação incompatíveis por design (HomologaPneu: JWT próprio; Intelli Tire: Supabase Auth + RLS multi-tenant), bancos de dados Supabase completamente distintos, e nenhuma necessidade real de deploy conjunto. Um monorepo criaria acoplamento de build/CI sem benefício correspondente.
2. **Repositórios separados sem documentação formal de fronteira** (o estado antes deste ADR) — rejeitada como estado final. Funcionou até agora porque o Intelli Tire ainda não tem código de aplicação, mas não escala: o primeiro contribuidor (humano ou IA) sem o contexto completo desta sessão poderia razoavelmente confundir os domínios, especialmente dado o vocabulário compartilhado ("integração", "dashboard", "catálogo").
3. **Repositórios separados + Constituição de IA + Quality Gate + ADR formal por produto** — **escolhida**. Custo de manutenção baixo (documentação, não infraestrutura), resolve o risco real (confusão de escopo), preserva a independência total de deploy/banco/autenticação que já existe hoje.

### Decisão

Manter HomologaPneu e Intelli Tire como produtos e repositórios completamente independentes, nunca compartilhando lógica de negócio, schema de banco ou modelo de autenticação. Comunicação futura entre os dois, se necessária, ocorre exclusivamente via API pública. Uma terceira camada lógica — Bibliotecas Compartilhadas — é reservada para código genuinamente genérico (design system, auth *generic primitives*, logging, utilitários), mas **não será extraída até que o Intelli Tire tenha código de aplicação real** que precise dela (ver `Architecture-Separation-Report.md` §5) — extrair uma biblioteca compartilhada hoje, com um único consumidor real, seria abstração prematura.

Cada produto mantém sua própria documentação (`00-AI-CONSTITUTION.md` a `07-ADR.md`), nunca compartilhada.

### Benefícios

- Elimina ambiguidade para qualquer assistente de IA trabalhando em qualquer um dos dois repositórios — a Constituição declara o escopo antes de qualquer tarefa.
- Não força nenhuma mudança estrutural no código hoje — a auditoria confirmou zero sobreposição real de tabelas, imports ou lógica entre os dois produtos.
- Mantém a opção de extrair bibliotecas compartilhadas no futuro sem pré-comprometer a forma dessa abstração.

### Riscos

- Overhead de manutenção de documentação duplicada por natureza (cada produto com seu próprio conjunto de 8 documentos) — mitigado por serem, em geral, curtos e de baixa frequência de mudança.
- Um cluster de páginas estáticas não versionadas dentro do HomologaPneu (`app/marketplace`, `app/analytics-avancado`, etc. — ver `Architecture-Separation-Report.md` §3.3) permanece com destino indefinido (remover vs. realocar para Intelli Tire) até decisão explícita do usuário; não é resolvido por este ADR.

### Impacto futuro

- Toda feature nova em qualquer um dos dois produtos passa pelo Quality Gate (`docs/06-QUALITY-GATES.md`) antes de código.
- Qualquer necessidade real de comunicação entre os dois produtos exige um novo ADR definindo o contrato de API pública — não existe hoje e não deve ser assumido implicitamente.
- A extração da primeira biblioteca compartilhada, quando acontecer, deve ser seu próprio ADR, um item por vez.
