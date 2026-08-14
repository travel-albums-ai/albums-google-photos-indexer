$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$baseUrl = "http://localhost:3000"
$node = $null

function Get-ServerStatus {
    try {
        return Invoke-RestMethod -Uri "$baseUrl/status" -Method Get -TimeoutSec 2
    } catch {
        return $null
    }
}

function Start-Server {
    if ($script:node -and !$script:node.HasExited) {
        return
    }

    if (Get-ServerStatus) {
        return
    }

    $script:node = Start-Process `
        -FilePath "$root\node.exe" `
        -ArgumentList "server.mjs --config server-config.json" `
        -WorkingDirectory $root `
        -PassThru
}

function Stop-Server {
    try {
        Invoke-RestMethod -Uri "$baseUrl/off" -Method Get -TimeoutSec 5 | Out-Null
    } catch {
        # The server may already be stopped.
    }

    if ($script:node -and !$script:node.HasExited) {
        Stop-Process $script:node.Id -Force
    }
    $script:node = $null
}

function Invoke-Server {
    try {
        Invoke-RestMethod -Uri "$baseUrl/on" -Method Get -TimeoutSec 5 | Out-Null
    } catch {
        # The server may already be stopped.
    }

    if ($script:node -and !$script:node.HasExited) {
        Stop-Process $script:node.Id -Force
    }
    $script:node = $null
}


Start-Server

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Application
$notify.Text = "Travel Albums"
$notify.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$open = $menu.Items.Add("Open")
$menu.Items.Add("-")
$start = $menu.Items.Add("Start Server")
$invoke = $menu.Items.Add("Invoke Server")
$stop = $menu.Items.Add("Stop Server")
$menu.Items.Add("-")
$exit = $menu.Items.Add("Exit")

$open.Add_Click({
    if (Get-ServerStatus) {
        Start-Process "$baseUrl/status"
    } else {
        [System.Windows.Forms.MessageBox]::Show("The server is not running.")
    }
})

$start.Add_Click({
    Start-Server
})

$invoke.Add_Click({
    Invoke-Server
})

$stop.Add_Click({
    Stop-Server
})

$exit.Add_Click({
    Stop-Server

    $notify.Visible = $false
    $notify.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$notify.ContextMenuStrip = $menu

[System.Windows.Forms.Application]::Run()
