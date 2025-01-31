import os
import json
import requests
import logging
from logging.handlers import RotatingFileHandler
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from pathlib import Path
import time
from datetime import datetime
import traceback

# Configure logging
def setup_logging():
    log_dir = Path.home() / ".vscode_ai_helper_logs"
    log_dir.mkdir(exist_ok=True)
    
    log_file = log_dir / "ai_helper.log"
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Rotating file handler (max 5MB per file, keep 5 backup files)
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=5*1024*1024,
        backupCount=5
    )
    file_handler.setFormatter(formatter)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    # Setup logger
    logger = logging.getLogger('ai_helper')
    logger.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

logger = setup_logging()

class AIMetrics:
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.start_time = None
        self.end_time = None
        self.task_count = 0
        self.error_count = 0
        self.total_tokens = 0
    
    def start_operation(self):
        self.start_time = datetime.now()
    
    def end_operation(self):
        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()
        logger.info(f"Operation completed in {duration:.2f} seconds")
        return duration
    
    def log_error(self, error):
        self.error_count += 1
        logger.error(f"Error occurred: {error}\n{traceback.format_exc()}")
    
    def log_tasks(self, count, tokens):
        self.task_count += count
        self.total_tokens += tokens
        logger.info(f"Generated {count} tasks ({tokens} tokens)")

class Config:
    def __init__(self):
        self.model = "deepseek-r1:1.5b"
        self.api_endpoint = "http://localhost:11434/api/generate"
        self.temperature = 0.7
        self.max_tokens = 500
        
        # Load config from file if exists
        config_path = Path.home() / ".vscode_ai_helper_config.json"
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
                self.model = config.get("model", self.model)
                self.api_endpoint = config.get("api_endpoint", self.api_endpoint)
                self.temperature = config.get("temperature", self.temperature)
                self.max_tokens = config.get("max_tokens", self.max_tokens)

class OllamaAPI:
    def __init__(self, config):
        self.config = config
    
    def generate_subtasks(self, task_description):
        try:
            prompt = f"""Break down the following programming task into detailed, actionable subtasks:

Task: {task_description}

Provide a structured breakdown following these rules:
1. Each subtask must be specific, clear, and directly actionable
2. Focus on implementation steps a developer would take
3. Include necessary technical considerations
4. Order subtasks logically from setup to implementation
5. Include error handling and validation steps where appropriate
6. Consider performance and maintainability

Format each subtask as a numbered list item starting with a number and dot (e.g. '1.', '2.', etc.).
Ensure each subtask is self-contained and can be completed independently.
"""
            
            response = requests.post(
                self.config.api_endpoint,
                json={
                    "model": self.config.model,
                    "prompt": prompt,
                    "temperature": self.config.temperature,
                    "max_tokens": self.config.max_tokens
                },
                timeout=30
            )
            
            if response.status_code != 200:
                raise Exception(f"API request failed with status {response.status_code}")
            
            response_text = response.json().get("response", "")
            if not response_text:
                raise Exception("Empty response from API")
            
            # Clean up and format response
            subtasks = []
            lines = [line.strip() for line in response_text.strip().split("\n") if line.strip()]
            
            for line in lines:
                # Match lines starting with numbers (1. or 1) and clean up formatting
                if any(line.startswith(f"{i}." if '.' in line else f"{i}") for i in range(1, 100)):
                    # Ensure consistent format with dot notation
                    if not '.' in line[:2]:
                        number = line.split()[0]
                        line = f"{number}. {' '.join(line.split()[1:])}"
                    subtasks.append(line)
            
            if not subtasks:
                raise Exception("Failed to generate valid subtasks from the response")
                
            return subtasks
            
        except requests.exceptions.ConnectionError:
            raise Exception("Failed to connect to Ollama API. Is the service running?")
        except Exception as e:
            raise Exception(f"Error generating subtasks: {str(e)}")

class VSCodeFileHandler(FileSystemEventHandler):
    def __init__(self, config):
        self.config = config
        self.ollama = OllamaAPI(config)
        self.last_modified = {}
        
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith((".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c")):
            # Debounce frequent modifications
            current_time = time.time()
            if event.src_path in self.last_modified:
                if current_time - self.last_modified[event.src_path] < 1:
                    return
            self.last_modified[event.src_path] = current_time
            
            try:
                self.process_file(event.src_path)
            except Exception as e:
                print(f"Error processing file {event.src_path}: {str(e)}")

    def process_file(self, filepath):
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()
            
            modified = False
            new_lines = []
            i = 0
            while i < len(lines):
                line = lines[i]
                new_lines.append(line)
                
                if "//ai" in line:
                    # Extract task description
                    task_description = line[line.index("//ai") + 4:].strip()
                    if not task_description:
                        i += 1
                        continue
                        
                    try:
                        # Generate subtasks
                        subtasks = self.ollama.generate_subtasks(task_description)
                        
                        # Format subtasks as comments
                        if subtasks:
                            new_lines.append("\n")
                            for subtask in subtasks:
                                new_lines.append(f"// {subtask}\n")
                            new_lines.append("\n")
                            modified = True
                    except Exception as e:
                        new_lines.append(f"// Error: {str(e)}\n")
                        modified = True
                
                i += 1
            
            if modified:
                with open(filepath, 'w') as f:
                    f.writelines(new_lines)
                    
        except Exception as e:
            print(f"Error reading/writing file {filepath}: {str(e)}")

def main():
    try:
        config = Config()
        event_handler = VSCodeFileHandler(config)
        observer = Observer()
        
        # Watch current directory recursively
        observer.schedule(event_handler, path=".", recursive=True)
        observer.start()

        print(f"AI Helper watching for '//ai' comments...")
        print(f"Using model: {config.model}")
        print(f"API endpoint: {config.api_endpoint}")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
            print("\nStopping file watcher...")
        
        observer.join()
        
    except Exception as e:
        print(f"Error starting file watcher: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())