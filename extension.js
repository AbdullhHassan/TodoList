const vscode = require("vscode");
const path = require("path");
const { PythonShell } = require("python-shell");

let pythonProcess = null;

function startPythonScript(document) {
  if (pythonProcess) {
    pythonProcess.kill();
  }

  const config = vscode.workspace.getConfiguration("vscode-ai-helper");
  const scriptPath = path.join(__dirname, "vscode_ai_helper.py");

  // Create a temporary config.json for the Python script
  const configJson = {
    model_name: config.get("modelName"),
    temperature: config.get("temperature"),
    api_base: config.get("apiEndpoint"),
  };

  const configPath = path.join(__dirname, "config.json");
  const fs = require("fs");
  fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2));

  const options = {
    mode: "text",
    pythonPath: "python",
    pythonOptions: ["-u"], // unbuffered output
    args: [document.fileName],
  };

  pythonProcess = new PythonShell(scriptPath, options);

  pythonProcess.on("message", function (message) {
    console.log("Python script output:", message);
  });

  pythonProcess.on("error", function (err) {
    vscode.window.showErrorMessage(`Error running AI helper: ${err.message}`);
  });

  pythonProcess.on("close", function () {
    pythonProcess = null;
  });
}

function activate(context) {
  console.log("VS Code AI Helper is now active");

  // Register command
  let disposable = vscode.commands.registerCommand(
    "vscode-ai-helper.processAIComments",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(
          "Please open a file to process AI comments"
        );
        return;
      }

      try {
        await startPythonScript(editor.document);
        vscode.window.showInformationMessage(
          "Successfully processed AI comments"
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to process AI comments: ${error.message}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);

  // Watch for active editor changes
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        startPythonScript(editor.document);
      }
    },
    null,
    context.subscriptions
  );

  // Watch for document changes
  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        // Debounce the changes to avoid too frequent updates
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
          startPythonScript(event.document);
        }, 1000); // Wait 1 second after last change
      }
    },
    null,
    context.subscriptions
  );

  // Start with current active editor if one exists
  if (vscode.window.activeTextEditor) {
    startPythonScript(vscode.window.activeTextEditor.document);
  }
}

function deactivate() {
  if (pythonProcess) {
    pythonProcess.kill();
  }
}

module.exports = {
  activate,
  deactivate,
};
