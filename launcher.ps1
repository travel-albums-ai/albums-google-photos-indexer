$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$baseUrl = "http://localhost:3000"
$githubUrl = "https://github.com/travel-albums-ai"
$deployedUrl = "https://web-app-travel-albums.vercel.app/#/allPhotos"

$script:node = $null

# ------------------------------------------------------------
# Server process
# ------------------------------------------------------------

function Test-ServerProcess {
    return $script:node -and !$script:node.HasExited
}

function Start-Server {
    if (Test-ServerProcess) {
        return
    }

    $script:node = Start-Process `
        -FilePath "$root\node.exe" `
        -ArgumentList "server.mjs --config server-config.json" `
        -WorkingDirectory $root `
        -PassThru
}

function Stop-Server {
    # Tell the server to shut itself down cleanly.
    # This is ONLY called explicitly by the user or on Exit.
    try {
        Invoke-RestMethod `
            -Uri "$baseUrl/off" `
            -Method Get `
            -TimeoutSec 5 `
            -ErrorAction Stop | Out-Null
    } catch {
        # Server may already be stopped.
    }

    if (Test-ServerProcess) {
        Stop-Process $script:node.Id -Force
    }

    $script:node = $null
}

function Invoke-Server {
    # Explicit user action, therefore HTTP is allowed here.
    try {
        Invoke-RestMethod `
            -Uri "$baseUrl/on" `
            -Method Get `
            -TimeoutSec 5 `
            -ErrorAction Stop | Out-Null
    } catch {
        # Server may not be ready yet.
    }
}

# ------------------------------------------------------------
# Windows Forms
# ------------------------------------------------------------

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ------------------------------------------------------------
# Status icons
# ------------------------------------------------------------

function New-StatusIcon {
    param(
        [System.Drawing.Color]$Color
    )

    $size = 16

    $bitmap = New-Object System.Drawing.Bitmap $size, $size

    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $brush = New-Object System.Drawing.SolidBrush $Color

    $graphics.FillEllipse(
        $brush,
        2,
        2,
        12,
        12
    )

    $graphics.Dispose()
    $brush.Dispose()

    return $bitmap
}

$greenIcon = New-StatusIcon ([System.Drawing.Color]::LimeGreen)
$redIcon   = New-StatusIcon ([System.Drawing.Color]::Crimson)

# Application icon
$appIcon = [System.Drawing.SystemIcons]::Application

# ------------------------------------------------------------
# Tray icon
# ------------------------------------------------------------

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = $appIcon
$notify.Text = "Travel Albums"
$notify.Visible = $true

# ------------------------------------------------------------
# Context menu
# ------------------------------------------------------------

$menu = New-Object System.Windows.Forms.ContextMenuStrip

# Status
$statusItem = $menu.Items.Add("Server: Stopped")
$statusItem.Enabled = $false
$statusItem.Image = $redIcon

$menu.Items.Add("-")

# Application
$openApp = $menu.Items.Add("Open Application")
$openApp.Image = $appIcon.ToBitmap()

$github = $menu.Items.Add("Open GitHub")
$github.Image = $appIcon.ToBitmap()

$deployed = $menu.Items.Add("Open Deployed App")
$deployed.Image = $appIcon.ToBitmap()

$menu.Items.Add("-")

# Server
$start = $menu.Items.Add("Start Server")
$start.Image = $appIcon.ToBitmap()

$invoke = $menu.Items.Add("Invoke Server")
$invoke.Image = $appIcon.ToBitmap()

$stop = $menu.Items.Add("Stop Server")
$stop.Image = $appIcon.ToBitmap()

$menu.Items.Add("-")

# Exit
$exit = $menu.Items.Add("Exit")

$notify.ContextMenuStrip = $menu

# ------------------------------------------------------------
# Status update
# ------------------------------------------------------------

function Update-Status {
    if (Test-ServerProcess) {
        $statusItem.Text = "Server: Running"
        $statusItem.Image = $greenIcon
        $notify.Text = "Travel Albums - Server running"
    }
    else {
        $statusItem.Text = "Server: Stopped"
        $statusItem.Image = $redIcon
        $notify.Text = "Travel Albums - Server stopped"
    }
}

# ------------------------------------------------------------
# Menu actions
# ------------------------------------------------------------

$openApp.Add_Click({
    # IMPORTANT:
    # No /status call here.
    # Just open the application. The browser will deal with
    # the server being unavailable if it isn't running.
    Start-Process $baseUrl
})

$github.Add_Click({
    Start-Process $githubUrl
})

$deployed.Add_Click({
    Start-Process $deployedUrl
})

$start.Add_Click({
    Start-Server
    Update-Status
})

$invoke.Add_Click({
    Invoke-Server
    Update-Status
})

$stop.Add_Click({
    Stop-Server
    Update-Status
})

$exit.Add_Click({
    Stop-Server

    $timer.Stop()
    $timer.Dispose()

    $notify.Visible = $false
    $notify.Dispose()

    $greenIcon.Dispose()
    $redIcon.Dispose()

    [System.Windows.Forms.Application]::Exit()
})

# Double-click tray icon opens application.
$notify.Add_DoubleClick({
    Start-Process $baseUrl
})

# ------------------------------------------------------------
# Live status timer
#
# IMPORTANT:
# This checks ONLY the node.exe process.
# It does NOT make HTTP requests.
# ------------------------------------------------------------

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000

$timer.Add_Tick({
    Update-Status
})

$timer.Start()

# ------------------------------------------------------------
# Start server
#
# No HTTP status check happens here.
# ------------------------------------------------------------

Start-Server
Update-Status

[System.Windows.Forms.Application]::Run()
