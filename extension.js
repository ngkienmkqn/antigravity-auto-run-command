// Auto Run Command Extension for Antigravity
// Tự động accept tất cả command approval prompts của agent
// Sử dụng Antigravity internal VS Code commands
//
// Command IDs extracted from:
// D:\Antigravity\resources\app\out\vs\workbench\workbench.desktop.main.js

const vscode = require('vscode');
const fs = require('fs');

const DEBUG_OUTPUT_FILE = 'd:\\Antigravity\\Extension\\Auto Run Command\\debug_output.txt';

/** @type {vscode.StatusBarItem} */
let statusBarItem;
/** @type {vscode.OutputChannel} */
let outputChannel;
/** @type {NodeJS.Timeout|null} */
let pollingInterval = null;
/** @type {boolean} */
let isEnabled = true;
/** @type {number} */
let acceptCount = 0;

// ============================================================
// Antigravity Internal Command IDs
// ============================================================

// Focus commands - must be called first to satisfy context keys
const FOCUS_COMMANDS = [
    'antigravity.agentPanel.focus',
];

// Accept commands - called after focus
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
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        9999
    );
    statusBarItem.command = 'autoRunCommand.toggle';
    updateStatusBar();
    statusBarItem.show();

    // --- COMMANDS ---

    const toggleCmd = vscode.commands.registerCommand('autoRunCommand.toggle', () => {
        isEnabled = !isEnabled;
        updateStatusBar();
        const msg = isEnabled
            ? '✅ Auto Run Command: ENABLED'
            : '⏸️ Auto Run Command: DISABLED';
        log(msg);
        vscode.window.showInformationMessage(msg);
        if (isEnabled) startPolling();
        else stopPolling();
    });

    const showLogCmd = vscode.commands.registerCommand('autoRunCommand.showLog', () => {
        outputChannel.show();
    });

    // DEBUG command
    const debugCmd = vscode.commands.registerCommand('autoRunCommand.debug', async () => {
        outputChannel.show();
        const debugLines = [];
        const debugLog = (msg) => { log(msg); debugLines.push(msg); };

        debugLog('═══════════════════════════════════');
        debugLog('🔍 DEBUG: Listing all Antigravity commands...');
        debugLog('═══════════════════════════════════');

        const allCommands = await vscode.commands.getCommands(true);
        const antigravityCommands = allCommands.filter(c =>
            c.toLowerCase().includes('antigravity') ||
            c.toLowerCase().includes('cascade') ||
            c.toLowerCase().includes('agent')
        ).sort();

        debugLog(`Found ${antigravityCommands.length} relevant commands:\n`);
        for (const cmd of antigravityCommands) {
            const isInOurList = ACCEPT_COMMANDS.includes(cmd) ? ' ← ACCEPT' :
                FOCUS_COMMANDS.includes(cmd) ? ' ← FOCUS' : '';
            debugLog(`  ${cmd}${isInOurList}`);
        }

        debugLog('\n═══════════════════════════════════');
        debugLog('🎯 Our commands:');
        for (const cmd of [...FOCUS_COMMANDS, ...ACCEPT_COMMANDS]) {
            const exists = allCommands.includes(cmd);
            debugLog(`  ${exists ? '✅' : '❌'} ${cmd}`);
        }

        // Test with focus first
        debugLog('\n🧪 Testing with FOCUS first...');
        try {
            await vscode.commands.executeCommand('antigravity.agentPanel.focus');
            debugLog('  ✅ Focused agent panel');
        } catch (err) {
            debugLog(`  ❌ Focus failed: ${err.message}`);
        }

        // Small delay after focus
        await new Promise(r => setTimeout(r, 200));

        for (const cmd of ACCEPT_COMMANDS) {
            try {
                const result = await vscode.commands.executeCommand(cmd);
                debugLog(`  ${cmd} → ${JSON.stringify(result)}`);
            } catch (err) {
                debugLog(`  ${cmd} → ERROR: ${err.message || err}`);
            }
        }
        debugLog('═══════════════════════════════════');

        try {
            fs.writeFileSync(DEBUG_OUTPUT_FILE, debugLines.join('\n'), 'utf8');
            debugLog(`\n📁 Written to: ${DEBUG_OUTPUT_FILE}`);
        } catch (err) {
            debugLog(`Write failed: ${err.message}`);
        }
    });

    // Config listener
    const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('autoRunCommand')) {
            const newConfig = vscode.workspace.getConfiguration('autoRunCommand');
            const newEnabled = newConfig.get('enabled', true);
            if (newEnabled !== isEnabled) {
                isEnabled = newEnabled;
                updateStatusBar();
                if (isEnabled) startPolling();
                else stopPolling();
            }
            if (e.affectsConfiguration('autoRunCommand.intervalMs') && isEnabled) {
                stopPolling();
                startPolling();
            }
            log('⚙️ Configuration updated');
        }
    });

    context.subscriptions.push(
        statusBarItem, outputChannel,
        toggleCmd, showLogCmd, debugCmd,
        configListener
    );

    if (isEnabled) startPolling();

    log('🎯 Auto Run Command is ready!');
    log('⌨️ Toggle: Ctrl+Shift+Alt+A | Debug: "Auto Run Command: Debug"');
}

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);

    const config = vscode.workspace.getConfiguration('autoRunCommand');
    const intervalMs = config.get('intervalMs', 300);
    log(`🔄 Polling started (every ${intervalMs}ms)`);

    pollingInterval = setInterval(async () => {
        if (!isEnabled) return;
        await executeAcceptCommands();
    }, intervalMs);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        log('⏹️ Polling stopped');
    }
}

/**
 * Execute accept commands with focus management.
 * Strategy: focus agent panel → accept step → accept terminal command
 */
async function executeAcceptCommands() {
    try {
        // Step 1: Focus the agent panel to satisfy context keys
        // This is needed because commands check antigravity.canAcceptOrRejectCommand
        await vscode.commands.executeCommand('antigravity.agentPanel.focus');
    } catch {
        // silently skip
    }

    // Step 2: Execute all accept commands
    for (const cmd of ACCEPT_COMMANDS) {
        try {
            await vscode.commands.executeCommand(cmd);
        } catch {
            // silently skip
        }
    }
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

function deactivate() {
    stopPolling();
    log('👋 Extension deactivated');
}

module.exports = { activate, deactivate };
