$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$baseUrl = "http://localhost:3001"
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
$openApp = $menu.Items.Add("Check Server")

$github = $menu.Items.Add("GitHub Project")
$github.Image = $appIcon.ToBitmap()

$deployed = $menu.Items.Add("Travel Albums")
$deployed.Image = $appIcon.ToBitmap()

$menu.Items.Add("-")

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
    Start-Process "$baseUrl/status"
})

$github.Add_Click({
    Start-Process $githubUrl
})

$deployed.Add_Click({
    Start-Process $deployedUrl
})

$exit.Add_Click({
    [System.Windows.Forms.Application]::Exit()
})

# Double-click tray icon opens status page.
$notify.Add_DoubleClick({
    Start-Process "$baseUrl/status"
})

# ------------------------------------------------------------
# Live status timer
#
# ONLY checks the local node.exe process.
# No HTTP requests are made here.
# ------------------------------------------------------------

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000

$timer.Add_Tick({
    Update-Status
})

$timer.Start()

# ------------------------------------------------------------
# Start server process
# ------------------------------------------------------------

Start-Server
Update-Status

[System.Windows.Forms.Application]::Run()
