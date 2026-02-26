// Auto Run Command Extension for Antigravity
// Tự động accept tất cả command approval prompts của agent
//
// How it works:
// 1. Sets Antigravity settings for auto-approve where possible
// 2. Uses antigravity.executeCascadeAction to set terminalAutoExecutionPolicy = EAGER (3)
// 3. Falls back to polling accept commands
//
// terminalAutoExecutionPolicy enum: UNSPECIFIED=0, OFF=1, AUTO=2, EAGER=3
// artifactReviewPolicy enum: UNSPECIFIED=0, ALWAYS=1, TURBO=2, AUTO=3

const vscode = require('vscode');

/** @type {vscode.StatusBarItem} */
let statusBarItem;
/** @type {vscode.OutputChannel} */
let outputChannel;
/** @type {NodeJS.Timeout|null} */
let pollingInterval = null;
/** @type {boolean} */
let isEnabled = true;

const ACCEPT_COMMANDS = [
    'antigravity.agent.acceptAgentStep',
    'antigravity.command.accept',
    'antigravity.terminalCommand.accept',
    'antigravity.terminalCommand.run',
    'antigravity.prioritized.agentAcceptAllInFile',
    'antigravity.prioritized.agentAcceptFocusedHunk',
];

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    outputChannel = vscode.window.createOutputChannel('Auto Run Command');
    log('🚀 Extension activated!');

    const config = vscode.workspace.getConfiguration('autoRunCommand');
    isEnabled = config.get('enabled', true);

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 9999);
    statusBarItem.command = 'autoRunCommand.toggle';
    updateStatusBar();
    statusBarItem.show();

    // Toggle command
    const toggleCmd = vscode.commands.registerCommand('autoRunCommand.toggle', () => {
        isEnabled = !isEnabled;
        updateStatusBar();
        const msg = isEnabled ? '✅ Auto Run Command: ENABLED' : '⏸️ Auto Run Command: DISABLED';
        log(msg);
        vscode.window.showInformationMessage(msg);
        if (isEnabled) { applyAllAutoApprove(); startPolling(); }
        else stopPolling();
    });

    const showLogCmd = vscode.commands.registerCommand('autoRunCommand.showLog', () => outputChannel.show());

    // Debug command
    const debugCmd = vscode.commands.registerCommand('autoRunCommand.debug', async () => {
        outputChannel.show();
        log('═══════════════════════════════════');
        log('🔍 DEBUG: Testing all approaches...');

        // Test cascade action
        log('\n🧪 Testing executeCascadeAction...');
        const actions = [
            { actionType: 'setTerminalAutoExecutionPolicy', payload: 3 },  // EAGER
            { actionType: 'setArtifactReviewPolicy', payload: 2 },  // TURBO
        ];
        for (const action of actions) {
            try {
                const result = await vscode.commands.executeCommand('antigravity.executeCascadeAction', action);
                log(`  ${action.actionType} → ${JSON.stringify(result)}`);
            } catch (err) {
                log(`  ${action.actionType} → ERROR: ${err.message}`);
            }
        }

        // Test JSON string payload
        log('\n🧪 Testing with JSON string payload...');
        for (const action of actions) {
            try {
                const result = await vscode.commands.executeCommand('antigravity.executeCascadeAction', JSON.stringify(action));
                log(`  ${action.actionType} (string) → ${JSON.stringify(result)}`);
            } catch (err) {
                log(`  ${action.actionType} (string) → ERROR: ${err.message}`);
            }
        }

        // Test accept commands
        log('\n🧪 Testing accept commands...');
        for (const cmd of ACCEPT_COMMANDS) {
            try {
                const result = await vscode.commands.executeCommand(cmd);
                log(`  ${cmd} → ${JSON.stringify(result)}`);
            } catch (err) {
                log(`  ${cmd} → ERROR: ${err.message}`);
            }
        }

        log('═══════════════════════════════════');
    });

    // Config listener
    const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('autoRunCommand.enabled')) {
            const newConfig = vscode.workspace.getConfiguration('autoRunCommand');
            const newEnabled = newConfig.get('enabled', true);
            if (newEnabled !== isEnabled) {
                isEnabled = newEnabled;
                updateStatusBar();
                if (isEnabled) { applyAllAutoApprove(); startPolling(); }
                else stopPolling();
            }
        }
    });

    context.subscriptions.push(statusBarItem, outputChannel, toggleCmd, showLogCmd, debugCmd, configListener);

    if (isEnabled) {
        applyAllAutoApprove();
        startPolling();
    }

    log('🎯 Auto Run Command is ready!');
    log('⌨️ Toggle: Ctrl+Shift+Alt+A | Debug: "Auto Run Command: Debug"');
}

/**
 * Apply all auto-approve mechanisms
 */
async function applyAllAutoApprove() {
    log('⚙️ Applying auto-approve...');

    // 1. VS Code settings
    try {
        const config = vscode.workspace.getConfiguration();
        await config.update('chat.tools.terminal.enableAutoApprove', true, vscode.ConfigurationTarget.Global);
        await config.update('chat.editing.autoAcceptDelay', 0, vscode.ConfigurationTarget.Global);
        log('  ✅ VS Code settings applied');
    } catch (err) {
        log(`  ❌ Settings: ${err.message}`);
    }

    // 2. Try executeCascadeAction to set terminalAutoExecutionPolicy = EAGER (3)
    const cascadeActions = [
        { actionType: 'setTerminalAutoExecutionPolicy', payload: 3 },   // EAGER
        { actionType: 'setArtifactReviewPolicy', payload: 2 },          // TURBO
    ];
    for (const action of cascadeActions) {
        try {
            await vscode.commands.executeCommand('antigravity.executeCascadeAction', action);
            log(`  ✅ ${action.actionType} = ${action.payload}`);
        } catch (err) {
            log(`  ⚠️ ${action.actionType}: ${err.message}`);
        }
        // Also try string variant
        try {
            await vscode.commands.executeCommand('antigravity.executeCascadeAction', JSON.stringify(action));
        } catch { }
    }

    log('⚙️ Auto-approve applied!');
}

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    const config = vscode.workspace.getConfiguration('autoRunCommand');
    const intervalMs = config.get('intervalMs', 300);
    log(`🔄 Polling started (every ${intervalMs}ms)`);

    pollingInterval = setInterval(async () => {
        if (!isEnabled) return;
        for (const cmd of ACCEPT_COMMANDS) {
            try { await vscode.commands.executeCommand(cmd); } catch { }
        }
    }, intervalMs);
}

function stopPolling() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; log('⏹️ Polling stopped'); }
}

function updateStatusBar() {
    if (isEnabled) {
        statusBarItem.text = `$(check) AUTO`;
        statusBarItem.tooltip = `Auto Run Command: ENABLED\nClick to disable`;
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = `$(debug-pause) PAUSED`;
        statusBarItem.tooltip = `Auto Run Command: DISABLED\nClick to enable`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

function log(message) {
    const time = new Date().toLocaleTimeString();
    outputChannel.appendLine(`[${time}] ${message}`);
}

function deactivate() { stopPolling(); log('👋 Extension deactivated'); }

module.exports = { activate, deactivate };
