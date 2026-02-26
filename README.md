# 🚀 Auto Run Command - Antigravity Extension

Tự động accept **tất cả** các command approval prompts của Antigravity agent. Không cần nhấn nút thủ công nữa!

## ✨ Features

- **Auto Accept** - Tự động click Run/Accept/Proceed/Apply cho mọi agent step
- **Safety Blocklist** - Chặn các lệnh nguy hiểm (`rm -rf /`, `format c:`, v.v.)
- **Status Bar** - Hiển thị trạng thái ✅ AUTO hoặc ⏸ PAUSED + số lệnh đã accept
- **Toggle** - Bật/tắt nhanh bằng `Ctrl+Shift+Alt+A` hoặc click status bar
- **Logging** - Xem log mọi lệnh đã auto-accept trong Output channel
- **Configurable** - Tuỳ chỉnh polling interval, blocklist, on/off cho từng loại

## 📦 Installation

### Cách 1: Copy trực tiếp
```
Copy folder này vào:
  Windows: %USERPROFILE%\.antigravity\extensions\auto-run-command\
  macOS:   ~/.antigravity/extensions/auto-run-command/
  Linux:   ~/.antigravity/extensions/auto-run-command/
```

### Cách 2: Install from VSIX
```bash
cd "d:\Antigravity\Extension\Auto Run Command"
npx vsce package --no-dependencies
# Mở Antigravity → Extensions → ⋯ → Install from VSIX → chọn file .vsix
```

### Cách 3: Symlink (Development)
```bash
# Windows (PowerShell as Admin)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.antigravity\extensions\auto-run-command" -Target "d:\Antigravity\Extension\Auto Run Command"
```

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `autoRunCommand.enabled` | `true` | Bật/tắt auto accept |
| `autoRunCommand.intervalMs` | `300` | Tần suất scan UI (ms) |
| `autoRunCommand.autoAcceptFileEdits` | `true` | Auto accept file edits |
| `autoRunCommand.autoAcceptTerminalCommands` | `true` | Auto accept terminal commands |
| `autoRunCommand.blockDangerousCommands` | `true` | Chặn lệnh nguy hiểm |
| `autoRunCommand.blocklist` | `[...]` | Danh sách lệnh bị chặn |

## ⌨️ Keybindings

| Command | Shortcut | Description |
|---------|----------|-------------|
| Toggle On/Off | `Ctrl+Shift+Alt+A` | Bật/tắt auto accept |
| Show Log | Command Palette → "Auto Run Command: Show Log" | Xem log |

## ⚠️ Lưu ý

- Extension sử dụng DOM polling, có thể cần update selectors khi Antigravity update UI
- Luôn review blocklist và thêm các lệnh nguy hiểm riêng của bạn
- Nên dùng trong môi trường sandbox (WSL, VM) cho an toàn tối đa
