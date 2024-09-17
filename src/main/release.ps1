param (
    [string]$NewVersionType = "minor",   # Tipo de versão: major, minor, patch
    [string]$DevelopBranch = "develop",  # Nome da branch de desenvolvimento
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

# 3. Verificar a branch principal automaticamente
function GetMainBranch {
    # Puxar todas as branches remotas
    $branches = git branch -r | ForEach-Object { $_.Trim() }
    $mainBranch = $null

    foreach ($branch in $branches) {
        if ($branch -like "*origin/main*") {
            $mainBranch = "main"
            break
        } elseif ($branch -like "*origin/master*") {
            $mainBranch = "master"
            break
        }
    }

    if (-not $mainBranch) {
        Write-Host "Erro: Nenhuma branch principal encontrada (main ou master)." -ForegroundColor Red
        exit 1
    }

    return $mainBranch
}

# 4. Captura a branch principal
$MainBranch = GetMainBranch
Write-Host "Branch principal encontrada: '$MainBranch'" -ForegroundColor Green

# 5. Criar uma nova branch de release com a nova versão
Write-Host "Criando nova versão usando 'standard-version'..." -ForegroundColor Green
npx standard-version --release-as $NewVersionType

# 6. Capturar a nova versão gerada
$NewVersion = git describe --tags --abbrev=0
$ReleaseBranch = "$Prefix$NewVersion"

# 7. Criar a nova branch de release
Write-Host "Criando a branch de release '$ReleaseBranch'..." -ForegroundColor Green
git checkout -b $ReleaseBranch

# 8. Commit e Push da nova branch de release
Write-Host "Fazendo commit e push da nova branch de release..." -ForegroundColor Green
git add .
git commit -m "chore(release): $NewVersion"
git push origin $ReleaseBranch

# 9. Merge a branch de release de volta para a branch principal
Write-Host "Merge da branch de release '$ReleaseBranch' para '$MainBranch'..." -ForegroundColor Green
git checkout $MainBranch
git merge --no-ff $ReleaseBranch

# 10. Push das mudanças na branch principal
Write-Host "Fazendo push das mudanças na branch '$MainBranch'..." -ForegroundColor Green
git push origin $MainBranch

# 11. Limpeza da branch de release (opcional)
Write-Host "Deletando a branch de release '$ReleaseBranch'..." -ForegroundColor Green
git branch -d $ReleaseBranch
git push origin --delete $ReleaseBranch

Write-Host "Fluxo de release completo com sucesso!" -ForegroundColor Green
exit 0
