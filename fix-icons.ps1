$filePath = "c:\Users\posta\live-arch\src\screens\main\OrbitHomeScreen.tsx"
$content = Get-Content $filePath -Raw
$content = $content -replace '<Icon\s', '<MaterialCommunityIcons '
Set-Content $filePath -Value $content
Write-Host "Icons fixed!"
