$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$baseUrl = "http://localhost:3001"
$githubUrl = "https://github.com/travel-albums-ai"
$deployedUrl = "https://web-app-travel-albums.vercel.app/#/allPhotos"

$script:server = $null

# ------------------------------------------------------------
# Server process
# ------------------------------------------------------------

function Test-ServerProcess {
    return $script:server -and !$script:server.HasExited
}

function Start-Server {
    if (Test-ServerProcess) {
        return
    }

    $script:server = Start-Process `
        -FilePath "$root\server.exe" `
        -ArgumentList "--config server-config.json" `
        -WorkingDirectory $root `
        -PassThru
}

# ------------------------------------------------------------
# Windows Forms
# ------------------------------------------------------------

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ------------------------------------------------------------
# Application icon
# ------------------------------------------------------------

$logoPath = Join-Path $root "logo.ico"

if (-not (Test-Path $logoPath)) {
    throw "Missing application icon: $logoPath"
}

$appIcon = [System.Drawing.Icon]::new($logoPath)

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

$statusItem = $menu.Items.Add("Server: Stopped")
$statusItem.Enabled = $false
$statusItem.Image = $redIcon

$menu.Items.Add("-")

$openApp = $menu.Items.Add("Check Server")

$github = $menu.Items.Add("GitHub Project")

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

$notify.Add_DoubleClick({
    Start-Process "$baseUrl/status"
})

# ------------------------------------------------------------
# Live status timer
# ------------------------------------------------------------

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000

$timer.Add_Tick({
    Update-Status
})

$timer.Start()

# ------------------------------------------------------------
# Start server
# ------------------------------------------------------------

Start-Server
Update-Status

[System.Windows.Forms.Application]::Run()

# ------------------------------------------------------------
# Cleanup
# ------------------------------------------------------------

$notify.Visible = $false
$notify.Dispose()

$appIcon.Dispose()
$greenIcon.Dispose()
$redIcon.Dispose()
