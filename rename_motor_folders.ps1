# Script untuk rename folder motors ke format UPPERCASE_UNDERSCORE

# Mapping: Old Name -> New Name
$folderMapping = @{
    "Adv" = "ADV_160"
    "Beat" = "BEAT"
    "Beat Street" = "BEAT_STREET"
    "CBR 150" = "CBR_150"
    "CBR 150 R" = "CBR_150R"
    "CBR 250" = "CBR_250R"
    "CRF 150" = "CRF_150L"
    "CUV e" = "CUV_E"
    "EM1 e" = "EM1_E"
    "Forza" = "FORZA"
    "GTR 150" = "GTR_150"
    "Genio" = "GENIO"
    "ICON e" = "ICON_E"
    "Pcx" = "PCX_160"
    "Revo" = "REVO"
    "Scoopy" = "SCOOPY"
    "Stylo" = "STYLO_160"
    "Supra X 125" = "SUPRA_X_125"
    "Vario 125" = "VARIO_125"
    "Vario 125 Street" = "VARIO_125_STREET"
    "Vario 160" = "VARIO_160"
}

$basePath = "images\motors"

Write-Host "🔄 Renaming motor folders..." -ForegroundColor Cyan

foreach ($oldName in $folderMapping.Keys) {
    $newName = $folderMapping[$oldName]
    $oldPath = Join-Path $basePath $oldName
    $newPath = Join-Path $basePath $newName
    
    if (Test-Path $oldPath) {
        if (Test-Path $newPath) {
            Write-Host "⚠️  Skip: $newName already exists" -ForegroundColor Yellow
        } else {
            Rename-Item -Path $oldPath -NewName $newName
            Write-Host "✅ Renamed: $oldName -> $newName" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Not found: $oldName" -ForegroundColor Red
    }
}

Write-Host "`n✨ Done! All folders renamed." -ForegroundColor Green
