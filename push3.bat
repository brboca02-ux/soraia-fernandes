@echo off
cd /d "c:\Users\HP\Desktop\Fassa\final\LOV 3.5\soraia-fernandes-main\brboca02-ux-soraia-fernandes-caff09f"

echo Abortando rebase em curso...
git rebase --abort 2>nul
git merge --abort 2>nul

echo Descartando stash pendente...
git stash drop 2>nul

echo Status:
git status --short

echo.
echo Usando nossas versoes dos arquivos conflitantes...
git checkout HEAD -- src/components/Header.tsx
git checkout HEAD -- src/components/HomeSections.tsx
git checkout HEAD -- src/routes/index.tsx

echo Adicionando todos os arquivos...
git add -A

echo.
echo Commit final...
git commit -m "feat: reestrutura loja — vestidos femininos compra e aluguel, hero video, menu atualizado"

echo.
echo Push forcado para main...
git push origin main --force

echo.
echo === CONCLUIDO ===
