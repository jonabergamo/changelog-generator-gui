param(
    [string]$directoryPath = $(throw "É necessário fornecer um caminho para o diretório.")
)

# Verifica se o diretório existe
if (-Not (Test-Path -Path $directoryPath)) {
    Write-Error "O diretório '$directoryPath' não existe."
    exit 1
}

# Lista os arquivos e diretórios no caminho especificado
Get-ChildItem -Path $directoryPath | Format-Table Name, Length, LastWriteTime -AutoSize
