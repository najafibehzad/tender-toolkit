param([Parameter(Mandatory=$true)][string]$File)
# One-shot CAD file analyzer: DWG/DXF -> entities.tsv -> summary
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$File = (Resolve-Path $File).Path
# accoreconsole mangles non-ASCII (Persian) paths -> copy to ASCII name first
if ($File -match '[^\x00-\x7F]') {
  $ascii = Join-Path $dir 'input.dwg'
  Copy-Item $File $ascii -Force
  $File = $ascii
}
$out = Join-Path $dir 'entities.tsv'
if (Test-Path $out) { Remove-Item $out -Force }

$p = Start-Process -FilePath 'C:\Program Files\Autodesk\AutoCAD 2027\accoreconsole.exe' `
  -ArgumentList '/i', $File, '/s', (Join-Path $dir 'dump.scr') `
  -RedirectStandardOutput (Join-Path $dir 'last-run.log') `
  -RedirectStandardError (Join-Path $dir 'last-run-err.log') -PassThru -Wait
if ($p.ExitCode -ne 0) { Write-Output "accoreconsole exit=$($p.ExitCode)" }
if (-not (Test-Path $out)) { Write-Output 'DUMP FAILED - see last-run.log'; exit 1 }

node (Join-Path $dir 'analyze.cjs') $out
Write-Output ''
Write-Output ("TSV: " + $out)
