// main.js
const vscode = acquireVsCodeApi();
let items = [];
let list, registerInput, registerButton, cancelButton, newTaskButton;

let settingsModal, settingsCancelButton, settingsCompleteButton;

let languageSelect, melchiorModelSelect, balthasarModelSelect, casparModelSelect;

// --- 追加: register-input保存用キー ---
const REGISTER_INPUT_KEY = 'registerInputValue';

// --- 追加: 保存関数 ---
function saveRegisterInputValue() {
    if (registerInput && registerInput.value) {
        vscode.setState({ ...vscode.getState(), [REGISTER_INPUT_KEY]: registerInput.value });
    }
}

// --- 追加: 復元関数 ---
function restoreRegisterInputValue() {
    const state = vscode.getState();
    if (state && state[REGISTER_INPUT_KEY]) {
        registerInput.value = state[REGISTER_INPUT_KEY];
        const displayText = document.getElementById('display-text');
        if (displayText) displayText.textContent = registerInput.value;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    list = document.getElementById("list");
    registerInput = document.getElementById("register-input");
    registerButton = document.getElementById("register-button");
    settingButton = document.getElementById("setting-button");
    cancelButton = document.getElementById('cancel-button');
    
    settingsModal = document.getElementById('settings-modal');
    settingsCancelButton = document.getElementById('settings-cancel-button');
    settingsCompleteButton = document.getElementById('settings-complete-button');
    languageSelect = document.getElementById('language-select');
    melchiorModelSelect = document.getElementById('melchior-model-select');
    balthasarModelSelect = document.getElementById('balthasar-model-select');
    casparModelSelect = document.getElementById('caspar-model-select');
    const fixedDisplay = document.getElementById('fixed-display');
    const displayText = document.getElementById('display-text');
    const toggleButton = document.getElementById('toggle-button');

    let isComposing = false;
    let isCollapsed = false;

    function updateFixedDisplay() {
        const inputValue = registerInput.value;
        displayText.textContent = inputValue;
    }

    registerInput.addEventListener('input', updateFixedDisplay);
    registerInput.addEventListener('paste', function() {
        setTimeout(updateFixedDisplay, 10);
    });

    // --- 追加: 入力時に保存 ---
    registerInput.addEventListener('input', saveRegisterInputValue);

    function toggleCollapse() {
        if (isCollapsed) {
            fixedDisplay.classList.remove('collapsed');
            toggleButton.textContent = '▲';
            isCollapsed = false;
        } else {
            fixedDisplay.classList.add('collapsed');
            toggleButton.textContent = '▼';
            isCollapsed = true;
        }
    }

    toggleButton.addEventListener('click', toggleCollapse);

    registerInput.addEventListener('compositionstart', function () {
        isComposing = true;
    });

    registerInput.addEventListener('compositionend', function () {
        isComposing = false;
    });

    registerInput.addEventListener('keydown', function (event) {
        // Enterのみ、Shift+Enter, Command+Enter, Ctrl+Enterは除外
        if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.metaKey && // Command (Mac)
            !event.ctrlKey && // Ctrl
            !isComposing
        ) {
            event.preventDefault();
            registerButton.click();
        }
    });

    registerButton.addEventListener("click", () => {
        if(executiing) {
            return;
        }
        const existingNewTaskButton = document.getElementById('new-task-button');
        if (existingNewTaskButton) {
            existingNewTaskButton.remove();
            newTaskButton = null;
        }
        registerButton.disabled = true;
        cancelButton.style.display = 'block';
        const value = registerInput.value;
        if (value) {
            registerInput.value = ""; 
            // --- 追加: 送信時に保存内容クリア ---
            vscode.setState({ ...vscode.getState(), [REGISTER_INPUT_KEY]: '' });
        }
        vscode.postMessage({
            type: "promptSended",
            text: value
        });
    });
    cancelButton.addEventListener("click", () => {
        registerButton.disabled = false;
        cancelButton.style.display = 'none';
        vscode.postMessage({
            type: "cancel"
        });
        createNewTaskButton();
    });
    settingButton.addEventListener("click", () => {
        vscode.postMessage({
            type: "openSettings"
        });
    });
    settingsCancelButton.addEventListener("click", () => {
        hideSettingsModal();
    });
    settingsCompleteButton.addEventListener("click", () => {
        const language = languageSelect.value;
        const melchiorModel = melchiorModelSelect.value;
        const balthasarModel = balthasarModelSelect.value;
        const casparModel = casparModelSelect.value;
        vscode.postMessage({
            type: "saveSettings",
            settings: {
                language: language,
                melchiorModel: melchiorModel,
                balthasarModel: balthasarModel,
                casparModel: casparModel
            }
        });
        hideSettingsModal();
    });
    vscode.postMessage({
        type: "requestState"
    });

    // --- 追加: 初期化時に復元 ---
    restoreRegisterInputValue();

    registerInput.focus();
});

function saveStateToVSCode() {
    vscode.postMessage({
        type: "saveState",
        messages: items
    });
}

function restoreState(messages) {
    items = messages || [];
    if (items.length !== 0) {
        cancelButton.style.display = 'block';
    } else {
        cancelButton.style.display = 'none';
    }
    updateDisplay();
}

function updateDisplay() {
    if (!list) return; 
    list.innerHTML = items.join(""); 
    requestAnimationFrame(() => {
        if (!list) return; 
        const contentDiv = list.parentElement; 
        if (contentDiv) {
            contentDiv.scrollTop = contentDiv.scrollHeight; 
        }
        list.scrollTop = list.scrollHeight; 
        const lastElement = list.lastElementChild;
        if (lastElement) {
            lastElement.scrollIntoView({ behavior: 'smooth', block: 'end' }); 
        }
    });
}
createPaneFromMessage = (message) => {
    return `<div class="${message.error ? "error":"message"} ${message.executor}"><div class="messageTitle">${message.title}</div><div>${message.text}</div></div>`;
}
let executiing = false;
function executionStarted() {
    let executiing = true;
}
function executionEnded() {
    let executiing = true;
    cancelButton.click();
    saveStateToVSCode();
    createNewTaskButton();
}
window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
        case "showMessage": {
            items.push(createPaneFromMessage(message));
            if (message.saveState) {
                saveStateToVSCode();
            }
            executiing = true;// for window display status change
            break;
        }
        case "complete": {
            items.push(`<span class="message ${message.executor}">${message.text}</span><br/>`);
            executionEnded();
            break;
        }
        case "restoreState": {
            restoreState(message.messages);
            return; 
        }
        case "requestStateRestore": {
            vscode.postMessage({
                type: "requestState"
            });
            return; 
        }
        case "showSettings": {
            showSettingsModal(message.settings, message.models);
            return; 
        }
        case "settingsSaved": {
            return; 
        }
    }
    updateDisplay(); 
});

function showSettingsModal(currentSettings, availableModels) {
    settingsModal.style.display = 'block';
    populateModelOptions(melchiorModelSelect, availableModels);
    populateModelOptions(balthasarModelSelect, availableModels);
    populateModelOptions(casparModelSelect, availableModels);
    if (currentSettings) {
        languageSelect.value = currentSettings.language || 'ja';
        melchiorModelSelect.value = currentSettings.melchiorModel || '';
        balthasarModelSelect.value = currentSettings.balthasarModel || '';
        casparModelSelect.value = currentSettings.casparModel || '';
    }
}

function hideSettingsModal() {
    settingsModal.style.display = 'none';
}

function populateModelOptions(selectElement, models) {
    selectElement.innerHTML = '<option value="">モデルを選択してください</option>';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.disabled = !(model.family === 'gpt-4.1');
        option.selected = model.family === 'gpt-4.1';
        option.textContent = `${model.name} (${model.family})`;
        selectElement.appendChild(option);
    });
}

function createNewTaskButton() {
    if (newTaskButton) {
        newTaskButton.remove();
    }
    newTaskButton = document.createElement('button');
    newTaskButton.id = 'new-task-button';
    newTaskButton.textContent = '新しい依頼';
    newTaskButton.style.width = '100%';
    newTaskButton.style.padding = '4px';
    newTaskButton.style.backgroundColor = 'lightblue';
    newTaskButton.style.color = 'black';
    newTaskButton.style.border = 'none';
    newTaskButton.style.borderRadius = '4px';
    newTaskButton.style.fontSize = '14px';
    newTaskButton.style.fontWeight = '500';
    newTaskButton.style.cursor = 'pointer';
    newTaskButton.style.marginBottom = '10px';
    newTaskButton.addEventListener('mouseenter', () => {
        newTaskButton.style.backgroundColor = '#add8e6';
    });
    newTaskButton.addEventListener('mouseleave', () => {
        newTaskButton.style.backgroundColor = 'lightblue';
    });
    newTaskButton.addEventListener('click', () => {
        items = []; 
        if (list) {
            list.innerHTML = ''; 
        }
        const displayText = document.getElementById('display-text');
        if (displayText) {
            displayText.textContent = ''; 
        }
        vscode.postMessage({
            type: "saveState",
            messages: []
        });
        newTaskButton.remove();
        newTaskButton = null;
        registerInput.focus();
    });
    const inputArea = registerInput.parentElement;
    inputArea.insertBefore(newTaskButton, registerInput);
}
