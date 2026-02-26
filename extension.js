// Auto Run Command Extension for Antigravity
// Tự động accept tất cả command approval prompts của agent
//
// Approach: Set Antigravity's built-in settings to auto-approve mode
// Settings found in workbench.desktop.main.js:
//   - chat.tools.terminal.enableAutoApprove → auto-approve terminal commands
//   - chat.editing.autoAcceptDelay → auto-accept file edits (0 = instant)
//   - chat.agent.terminal.autoApprove → terminal auto-approve rules

const vscode = require('vscode');

/** @type {vscode.StatusBarItem} */
let statusBarItem;
/** @type {vscode.OutputChannel} */
let outputChannel;
/** @type {boolean} */
let isEnabled = true;

// Original settings backup for restore on disable
let originalSettings = {};

// Settings to force auto-approve
const AUTO_APPROVE_SETTINGS = {
    'chat.tools.terminal.enableAutoApprove': true,
    'chat.editing.autoAcceptDelay': 0,
};

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
        if (isEnabled) {
            applyAutoApproveSettings();
            log('✅ Auto Run Command: ENABLED - settings applied');
            vscode.window.showInformationMessage('✅ Auto Run Command: ENABLED');
        } else {
            restoreOriginalSettings();
            log('⏸️ Auto Run Command: DISABLED - settings restored');
            vscode.window.showInformationMessage('⏸️ Auto Run Command: DISABLED');
        }
    });

    const showLogCmd = vscode.commands.registerCommand('autoRunCommand.showLog', () => {
        outputChannel.show();
    });

    // DEBUG command - list all chat/agent settings
    const debugCmd = vscode.commands.registerCommand('autoRunCommand.debug', async () => {
        outputChannel.show();
        log('═══════════════════════════════════');
        log('🔍 DEBUG: Current auto-approve settings');
        log('═══════════════════════════════════');

        const chatConfig = vscode.workspace.getConfiguration('chat');
        const allChatKeys = [
            'tools.terminal.enableAutoApprove',
            'tools.terminal.autoApprove',
            'tools.terminal.ignoreDefaultAutoApproveRules',
            'agent.terminal.autoApprove',
            'editing.autoAcceptDelay',
            'editing.confirmEditRequestRemoval',
        ];

        for (const key of allChatKeys) {
            try {
                const val = chatConfig.get(key);
                const inspect = chatConfig.inspect(key);
                log(`  chat.${key}:`);
                log(`    current = ${JSON.stringify(val)}`);
                log(`    default = ${JSON.stringify(inspect?.defaultValue)}`);
                log(`    global  = ${JSON.stringify(inspect?.globalValue)}`);
            } catch (err) {
                log(`  chat.${key}: ERROR - ${err.message}`);
            }
        }

        // Also check antigravity-specific settings
        const antigravityConfig = vscode.workspace.getConfiguration('antigravity');
        log('\n  Antigravity settings:');
        for (const key of ['terminalExecutionPolicy', 'terminalAutoExecutionPolicy', 'autoApprove']) {
            try {
                const val = antigravityConfig.get(key);
                if (val !== undefined) {
                    log(`    antigravity.${key} = ${JSON.stringify(val)}`);
                }
            } catch { }
        }

        // Try all known accept commands
        log('\n🧪 Testing accept commands...');
        const cmds = [
            'antigravity.agent.acceptAgentStep',
            'antigravity.command.accept',
            'antigravity.terminalCommand.accept',
            'antigravity.terminalCommand.run',
        ];
        for (const cmd of cmds) {
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
                if (isEnabled) applyAutoApproveSettings();
                else restoreOriginalSettings();
            }
        }
    });

    context.subscriptions.push(
        statusBarItem, outputChannel,
        toggleCmd, showLogCmd, debugCmd,
        configListener
    );

    // Apply settings on startup
    if (isEnabled) {
        applyAutoApproveSettings();
    }

    log('🎯 Auto Run Command is ready!');
    log('⌨️ Toggle: Ctrl+Shift+Alt+A | Debug: "Auto Run Command: Debug"');
}

/**
 * Backup current settings then apply auto-approve settings
 */
async function applyAutoApproveSettings() {
    log('⚙️ Applying auto-approve settings...');

    for (const [key, value] of Object.entries(AUTO_APPROVE_SETTINGS)) {
        try {
            const config = vscode.workspace.getConfiguration();
            const inspect = config.inspect(key);

            // Backup original value
            originalSettings[key] = inspect?.globalValue;

            // Apply new value globally
            await config.update(key, value, vscode.ConfigurationTarget.Global);
            log(`  ✅ ${key} = ${JSON.stringify(value)}`);
        } catch (err) {
            log(`  ❌ ${key}: ${err.message}`);
        }
    }

    log('✅ Auto-approve settings applied!');
}

/**
 * Restore original settings when disabled
 */
async function restoreOriginalSettings() {
    log('⚙️ Restoring original settings...');

    for (const [key, originalValue] of Object.entries(originalSettings)) {
        try {
            const config = vscode.workspace.getConfiguration();
            await config.update(key, originalValue, vscode.ConfigurationTarget.Global);
            log(`  ↩️ ${key} = ${JSON.stringify(originalValue)}`);
        } catch (err) {
            log(`  ❌ ${key}: ${err.message}`);
        }
    }

    log('↩️ Settings restored!');
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
    // Optionally restore settings on deactivate
    // restoreOriginalSettings();
    log('👋 Extension deactivated');
}

module.exports = { activate, deactivate };
