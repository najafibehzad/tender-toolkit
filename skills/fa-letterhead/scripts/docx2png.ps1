# docx2png.ps1 — render DOCX to PDF (Word COM) then to per-page PNG (WinRT), no Python needed.
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File docx2png.ps1 -Docx "C:\abs\file.docx" -OutDir "C:\abs\qa" -Dpi 130
# Output: page1.png, page2.png, ... in OutDir (plus a .render.pdf intermediate).
param(
  [Parameter(Mandatory=$true)][string]$Docx,
  [Parameter(Mandatory=$true)][string]$OutDir,
  [int]$Dpi = 130
)
$ErrorActionPreference = 'Stop'
$OutDir = (New-Item -ItemType Directory -Force -Path $OutDir).FullName
$pdf = Join-Path $OutDir ((Split-Path $Docx -Leaf) + '.render.pdf')

# --- 1) DOCX -> PDF via Word COM (best fidelity for B-series Persian fonts) ---
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
try {
  $doc = $w.Documents.Open((Resolve-Path $Docx).Path, $false, $true)  # ReadOnly
  $doc.SaveAs2($pdf, 17)   # wdFormatPDF
  $doc.Close(0)
} finally {
  $w.Quit()
}

# --- 2) PDF -> PNG via WinRT PdfDocument (works without poppler/pymupdf) ---
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]

function AwaitOp($WinRtTask, $ResultType) {
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
  $netTask = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
function AwaitAct($WinRtAction) {
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
  $netTask = $asTask.Invoke($null, @($WinRtAction))
  $netTask.Wait(-1) | Out-Null
}

$file = AwaitOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdf)) ([Windows.Storage.StorageFile])
$pdfDoc = AwaitOp ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$scale = $Dpi / 96.0
for ($i = 0; $i -lt $pdfDoc.PageCount; $i++) {
  $page = $pdfDoc.GetPage($i)
  $renderer = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $renderer.DestinationWidth = [uint32]($page.Size.Width * $scale)
  $renderer.DestinationHeight = [uint32]($page.Size.Height * $scale)
  $mem = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  AwaitAct ($page.RenderToStreamAsync($mem, $renderer))
  $size = [uint32]$mem.Size
  $reader = New-Object Windows.Storage.Streams.DataReader($mem.GetInputStreamAt(0))
  $null = AwaitOp ($reader.LoadAsync($size)) ([UInt32])
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  $outName = Join-Path $OutDir ("page{0}.png" -f ($i+1))
  [IO.File]::WriteAllBytes($outName, $bytes)
  $reader.DetachStream(); $mem.Dispose(); $page.Dispose()
  Write-Output ("page{0}.png {1} bytes" -f ($i+1), (Get-Item $outName).Length)
}
Write-Output "DONE $($pdfDoc.PageCount) pages"
