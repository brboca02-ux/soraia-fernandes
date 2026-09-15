# Plano: Puxar alterações do GitHub

## Objetivo
Trazer as alterações mais recentes do repositório GitHub (`brboca02-ux/soraia-fernandes`, branch `main`) para o projeto Lovable, garantindo que o app continue funcionando após o merge.

## Estado atual confirmado
- Branch local ativa: `edit/edt-9d8bd11c-2ed6-4359-ade4-460c4570961b`
- Último commit local: `9f299fd Fixed project build errors`
- Working tree: limpo (sem alterações não commitadas)
- GitHub já conectado na interface do Lovable e, segundo o print, "In sync with GitHub"
- Nenhum remote do GitHub configurado localmente no sandbox (apenas os remotes internos do Lovable)

## Passos

1. **Adicionar o remote do GitHub** no sandbox para poder inspecionar e buscar os commits (`git remote add github https://github.com/brboca02-ux/soraia-fernandes.git`).

2. **Buscar a branch main do GitHub** (`git fetch github main`) e identificar se existem commits no GitHub que ainda não estão no projeto local.

3. **Comparar commits** (`git log --oneline --graph --left-right --decorate local...github/main`) para entender o que mudou e se há divergência.

4. **Integrar as alterações**:
   - Se o GitHub estiver à frente: fazer merge/rebase dos commits do GitHub para a branch local edit.
   - Se houver conflitos: resolvê-los manualmente, priorizando as mudanças do GitHub quando forem intencionais, e manter as correções recentes de build.

5. **Verificar build**: executar o build/typecheck do projeto para garantir que nada quebrou após o merge.

6. **Validar preview**: confirmar que a prévia responde corretamente e que as páginas principais (home, login, etc.) carregam sem erro.

## Riscos e cuidados
- A branch local é uma branch de edição do Lovable, não a `main`. O merge deve ser feito nela para não perder o contexto atual.
- Se o GitHub tiver mudanças estruturais grandes (ex.: remoção de arquivos essenciais como `package.json`/`vite.config.ts`), será preciso reconciliar com o estado restaurado recentemente.
- Em caso de conflito em arquivos de configuração ou rotas críticas, resolver mantendo a versão que preserve a funcionalidade da prévia.

## Critério de conclusão
- Commits do GitHub integrados à branch local
- Build OK registrado em `/tmp/observability/build-errors.log`
- Preview respondendo em `http://localhost:8080/`
