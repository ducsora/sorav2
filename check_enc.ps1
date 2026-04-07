
$html = [System.IO.File]::ReadAllText("shuffler.html", [System.Text.Encoding]::UTF8)
Write-Host "Current first 200 chars:"
Write-Host $html.Substring(0, 200)
