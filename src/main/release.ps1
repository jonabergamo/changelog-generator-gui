param (
    [string]$NewVersionType = "minor",   # Tipo de versão: major, minor, patch
    [string]$DevelopBranch = "develop",  # Nome da branch de desenvolvimento
    [string]$MainBranch = "master",      # Nome da branch principal
    [string]$Prefix = "release/",        # Prefixo para a branch de release
    [string]$WorkingDirectory            # Caminho do diretório onde o script será executado
)

# Verificar se o diretório foi fornecido
if (-not $WorkingDirectory) {
    Write-Host "Erro: Caminho do diretório de trabalho não foi fornecido." -ForegroundColor Red
    exit 1
}

# 0. Mudar para o diretório de trabalho especificado
Write-Host "Mudando para o diretório de trabalho '$WorkingDirectory'..." -ForegroundColor Green
Set-Location -Path $WorkingDirectory

# Função para verificar se há mudanças não comitadas
function CheckForUncommittedChanges {
    $status = git status --porcelain
    if ($status) {
        Write-Host "Erro: Existem mudanças não comitadas. Commite ou stashe suas mudanças antes de continuar." -ForegroundColor Red
        exit 1
    }
}

# 1. Verificar se existem mudanças não comitadas
CheckForUncommittedChanges

# 2. Checkout na branch de desenvolvimento e atualizá-la
Write-Host "Fazendo checkout na branch '$DevelopBranch' e atualizando-a..." -ForegroundColor Green
git checkout $DevelopBranch
git pull origin $DevelopBranch

# 3. Criar uma nova branch de release com a nova versão
Write-Host "Criando nova versão usando 'standard-version'..." -ForegroundColor Green
npx standard-version --release-as $NewVersionType

# 4. Capturar a nova versão gerada
$NewVersion = git describe --tags --abbrev=0
$ReleaseBranch = "$Prefix$NewVersion"

# 5. Criar a nova branch de release
Write-Host "Criando a branch de release '$ReleaseBranch'..." -ForegroundColor Green
git checkout -b $ReleaseBranch

# 6. Commit e Push da nova branch de release
Write-Host "Fazendo commit e push da nova branch de release..." -ForegroundColor Green
git add .
git commit -m "chore(release): $NewVersion"
git push origin $ReleaseBranch

# 7. Merge a branch de release de volta para develop
Write-Host "Merge da branch de release '$ReleaseBranch' para '$DevelopBranch'..." -ForegroundColor Green
git checkout $DevelopBranch
git merge --no-ff $ReleaseBranch

# 8. Push das mudanças na develop
Write-Host "Fazendo push das mudanças na branch '$DevelopBranch'..." -ForegroundColor Green
git push origin $DevelopBranch

# 9. Limpeza da branch de release (opcional)
Write-Host "Deletando a branch de release '$ReleaseBranch'..." -ForegroundColor Green
git branch -d $ReleaseBranch
git push origin --delete $ReleaseBranch

Write-Host "Fluxo de release completo com sucesso!" -ForegroundColor Green
