# Quality Gates — HomologaPneu

## Gate obrigatório antes de qualquer feature nova

Antes de implementar qualquer coisa, responder:

1. Isso pertence ao HomologaPneu (homologação de pneus, catálogo de veículos, aplicações OEM, documentos de homologação)?
2. Isso pertence ao Intelli Tire (BI, compras, vendas, estoque, pricing, ERP)?
3. Isso pertence a uma futura biblioteca compartilhada (autenticação genérica, design system, logging, utilitários)?

**Se a resposta não for claramente "1", PARE e peça aprovação arquitetural antes de escrever código.** Não implementar "só para não travar o usuário" — um recurso implementado no produto errado é mais caro de desfazer do que uma pergunta.

## Checklist rápido de contaminação

Antes de commitar qualquer arquivo novo, verificar se ele:
- [ ] Não importa nada de `C:\Projetos\intelli-tire-platform`
- [ ] Não introduz tabelas/modelos de domínio comercial (compras, vendas, estoque, preços, ERP)
- [ ] Não introduz autenticação baseada em `tenant_id`/multi-tenant (este produto não é multi-tenant)
- [ ] Não usa o vocabulário "integração"/"dashboard" no sentido do Intelli Tire (ver `docs/00-AI-CONSTITUTION.md`)

Ver também o fluxo de aprovação já em vigor para mudanças de banco/segurança: Arquiteto → Banco → Segurança → Performance → QA → Código (`HomologaPneu_Fluxo_Aprovacao_e_Governanca.md`, incorporado nas migrations RLS desta fase — `docs/rls-fase1-identidade-homologacoes.md`). Este Quality Gate de produto roda **antes** desse fluxo, na etapa "Arquiteto".
