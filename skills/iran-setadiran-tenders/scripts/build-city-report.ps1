#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build Setadiran tender report for a city.

.DESCRIPTION
    Full pipeline: fetch announcements, fetch details, generate HTML, measure, QA, render PDF, copy outputs.

.PARAMETER Province
    Province name (default: "تهران")

.PARAMETER City
    City name (default: "قدس")

.PARAMETER OutputDir
    Output directory for final PDF/HTML (default: "C:\Desktop")

.PARAMETER PdfBuildDir
    PDF build working directory (default: "C:\Users\behzad\.zcode\workspace\default\pdf-build")

.PARAMETER SkillDir
    Skill directory containing fetch scripts (default: "C:\Users\behzad\.agents\skills\iran-setadiran-tenders")

.PARAMETER SkipFetch
    Skip fetching if data already exists (switch)
#>

[CmdletBinding()]
param(
    [string]$Province = "تهران",
    [string]$City = "قدس",
    [string]$OutputDir = "C:\Desktop",
    [string]$PdfBuildDir = "C:\Users\behzad\.zcode\workspace\default\pdf-build",
    [string]$SkillDir = "C:\Users\behzad\.agents\skills\iran-setadiran-tenders",
    [switch]$SkipFetch
)

$ErrorActionPreference = "Stop"

function Write-Step($step, $msg) {
    Write-Host "=== STEP $step: $msg ===" -ForegroundColor Cyan
}

function Write-ErrorExit($step, $msg) {
    Write-Host "!!! FAILED STEP $step: $msg !!!" -ForegroundColor Red
    exit 1
}

function Check-Command($cmd, $name) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-ErrorExit "CHECK" "$name not found in PATH. Please install $name."
    }
}

# Check prerequisites
Write-Step 0 "Checking prerequisites"
Check-Command "node" "Node.js"
Check-Command "chrome.exe" "Chrome"
if (-not (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe")) {
    Write-ErrorExit "CHECK" "Chrome not found at C:\Program Files\Google\Chrome\Application\chrome.exe"
}

# City slug for output filename (replace spaces/dashes)
$citySlug = $City -replace "[\s\-]", ""

Set-Location -LiteralPath $PdfBuildDir
Write-Step 0 "Working directory: $PdfBuildDir"

# Step 1: Fetch announcements
if (-not $SkipFetch) {
    Write-Step 1 "Fetching announcements for $Province / $City"
    $fetchAnn = "$SkillDir\scripts\fetch_announcements.js"
    if (-not (Test-Path -LiteralPath $fetchAnn)) {
        Write-ErrorExit 1 "fetch_announcements.js not found at $fetchAnn"
    }
    $exitCode = 0
    try {
        & node $fetchAnn $Province $City
        $exitCode = $LASTEXITCODE
    } catch {
        $exitCode = 1
    }
    if ($exitCode -ne 0) { Write-ErrorExit 1 "fetch_announcements.js exited with code $exitCode" }
}

# Step 2: Fetch details
if (-not $SkipFetch) {
    Write-Step 2 "Fetching details"
    $fetchDet = "$SkillDir\scripts\fetch_details.js"
    if (-not (Test-Path -LiteralPath $fetchDet)) {
        Write-ErrorExit 2 "fetch_details.js not found at $fetchDet"
    }
    $exitCode = 0
    try {
        & node $fetchDet
        $exitCode = $LASTEXITCODE
    } catch {
        $exitCode = 1
    }
    if ($exitCode -ne 0) { Write-ErrorExit 2 "fetch_details.js exited with code $exitCode" }
}

# Step 3: Clean up stale artifacts
Write-Step 3 "Cleaning up stale artifacts"
$artifacts = @("measure.html", "heights.json", "report.html")
foreach ($artifact in $artifacts) {
    if (Test-Path -LiteralPath $artifact) {
        Remove-Item -LiteralPath $artifact -Force
        Write-Host "  Removed $artifact"
    }
}

# Step 4: First gen_city_report.js (creates measure.html)
Write-Step 4 "Running gen_city_report.js (first pass)"
$genCity = "$PdfBuildDir\gen_city_report.js"
$fallbackGenCity = "$SkillDir\assets\report\gen_city_report.js"
if (-not (Test-Path -LiteralPath $genCity)) {
    if (Test-Path -LiteralPath $fallbackGenCity) {
        $genCity = $fallbackGenCity
        Write-Host "  Using fallback: $genCity"
    } else {
        Write-ErrorExit 4 "gen_city_report.js not found at $genCity or $fallbackGenCity"
    }
}
$exitCode = 0
try {
    & node $genCity
    $exitCode = $LASTEXITCODE
} catch {
    $exitCode = 1
}
if ($exitCode -ne 0) { Write-ErrorExit 4 "gen_city_report.js (first pass) exited with code $exitCode" }

# Step 5: measure.js
Write-Step 5 "Running measure.js"
$measure = "$PdfBuildDir\measure.js"
$fallbackMeasure = "$SkillDir\assets\report\measure.js"
if (-not (Test-Path -LiteralPath $measure)) {
    if (Test-Path -LiteralPath $fallbackMeasure) {
        $measure = $fallbackMeasure
        Write-Host "  Using fallback: $measure"
    } else {
        Write-ErrorExit 5 "measure.js not found at $measure or $fallbackMeasure"
    }
}
$exitCode = 0
try {
    & node $measure
    $exitCode = $LASTEXITCODE
} catch {
    $exitCode = 1
}
if ($exitCode -ne 0) { Write-ErrorExit 5 "measure.js exited with code $exitCode" }

# Step 6: Second gen_city_report.js (creates report.html)
Write-Step 6 "Running gen_city_report.js (second pass)"
$exitCode = 0
try {
    & node $genCity
    $exitCode = $LASTEXITCODE
} catch {
    $exitCode = 1
}
if ($exitCode -ne 0) { Write-ErrorExit 6 "gen_city_report.js (second pass) exited with code $exitCode" }

# Step 7: QA report
Write-Step 7 "Running qa_report.js"
$qa = "$PdfBuildDir\qa_report.js"
if (-not (Test-Path -LiteralPath $qa)) {
    Write-ErrorExit 7 "qa_report.js not found at $qa"
}
$exitCode = 0
try {
    & node $qa
    $exitCode = $LASTEXITCODE
} catch {
    $exitCode = 1
}
if ($exitCode -ne 0) { Write-ErrorExit 7 "qa_report.js exited with code $exitCode" }

# Step 8: Render PDF
Write-Step 8 "Rendering PDF"
$render = "$PdfBuildDir\render.js"
if (-not (Test-Path -LiteralPath $render)) {
    Write-ErrorExit 8 "render.js not found at $render"
}
$pdfName = "$citySlug-report.pdf"
$exitCode = 0
try {
    & node $render "report.html" $pdfName
    $exitCode = $LASTEXITCODE
} catch {
    $exitCode = 1
}
if ($exitCode -ne 0) { Write-ErrorExit 8 "render.js exited with code $exitCode" }

# Step 9: Copy outputs
Write-Step 9 "Copying outputs to $OutputDir\$citySlug"
$outDir = Join-Path $OutputDir $citySlug
if (-not (Test-Path -LiteralPath $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}
Copy-Item -LiteralPath $pdfName -Destination (Join-Path $outDir $pdfName) -Force
Copy-Item -LiteralPath "report.html" -Destination (Join-Path $outDir "report.html") -Force
Write-Host "  Copied $pdfName"
Write-Host "  Copied report.html"

# Summary
Write-Step 10 "SUMMARY"
Write-Host "Province: $Province"
Write-Host "City: $City"
Write-Host "City slug: $citySlug"
Write-Host "Output directory: $outDir"
Write-Host "PDF: $outDir\$pdfName"
Write-Host "HTML: $outDir\report.html"
Write-Host ""
Write-Host "=== ALL STEPS COMPLETED SUCCESSFULLY ===" -ForegroundColor Green

