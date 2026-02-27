$dir = "d:\DVS\db\optima\src\components\pull-request"
$files = @('THC.tsx','TAK.tsx','TLP.tsx','KDP.tsx','DbLoanSaving.tsx','FixAsset.tsx','DetailAnggota.tsx')
$oldClass = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center'
$newClass = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center'

foreach ($file in $files) {
    $path = Join-Path $dir $file
    $content = Get-Content $path -Raw -Encoding UTF8
    if ($content -match [regex]::Escape($oldClass)) {
        $newContent = $content.Replace($oldClass, $newClass)
        [System.IO.File]::WriteAllText($path, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed: $file"
    } else {
        Write-Host "No match (already fixed or different): $file"
    }
}
Write-Host "Done."
