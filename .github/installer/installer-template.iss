[Setup]
AppName={0}
AppVersion={1}
DefaultDirName={pf}\{0}
DefaultGroupName={0}
OutputBaseFilename={2}
Compression=lzma
SolidCompression=yes

[Files]
Source: "dist-windows-arm64\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Run {0}"; Filename: "{app}\run-windows.cmd"; WorkingDir: "{app}"

[Run]
Filename: "{app}\run-windows.cmd"; Description: "Launch {0}"; Flags: nowait postinstall skipifsilent
