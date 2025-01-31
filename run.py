import subprocess
import sys
import os
import pkg_resources

# === Colors ===
GREEN = "\033[92m"
RED   = "\033[91m"
YELLOW= "\033[93m"
RESET = "\033[0m"

# === Checks ===
def check_python_version():
    print(f"{YELLOW}Checking Python version... ⚙️{RESET}")
    if sys.version_info < (3, 7):
        print(f"{RED}Error: Python 3.7+ required ❌{RESET}")
        return False
    print(f"{GREEN}✓ Python {sys.version_info.major}.{sys.version_info.minor} ✅{RESET}")
    return True

def check_dependencies():
    print(f"{YELLOW}\nChecking dependencies... 📦{RESET}")
    if not os.path.exists('requirements.txt'):
        print(f"{RED}Error: 'requirements.txt' missing ❌{RESET}")
        return False
    
    required = {}
    with open('requirements.txt') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                for sep in ['==','>=','<=','>']:
                    if sep in line:
                        pkg, ver = line.split(sep, 1)
                        required[pkg.strip()] = ver.strip()
                        break
    
    missing = []
    for p, v in required.items():
        try:
            pkg_resources.require(f"{p}=={v}")
        except (pkg_resources.DistributionNotFound, pkg_resources.VersionConflict):
            missing.append(f"{p}=={v}")
    
    if missing:
        print(f"{RED}Missing packages: ❌{RESET}")
        for m in missing:
            print(f"  - {m}")
        print(f"{YELLOW}\nInstalling missing packages... ⏳{RESET}")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
            print(f"{GREEN}✓ Installed missing packages ✅{RESET}")
        except subprocess.CalledProcessError:
            print(f"{RED}Error: Could not install packages ❌{RESET}")
            return False
    else:
        print(f"{GREEN}✓ All packages are installed ✅{RESET}")
    
    return True

def check_database():
    print(f"{YELLOW}\nChecking database... 🗃️{RESET}")
    db_path = 'todos.db'
    if not os.path.exists(db_path):
        print(f"{YELLOW}No database file found, it will be created later ⚠️{RESET}")
    else:
        try:
            import sqlite3
            conn = sqlite3.connect(db_path)
            conn.close()
            print(f"{GREEN}✓ Database accessible ✅{RESET}")
        except Exception:
            print(f"{RED}Error: Database file not accessible ❌{RESET}")
            return False
    return True

# === Subprocess control ===
app_process = None

def start_app():
    global app_process
    if app_process is not None:
        print(f"{RED}App already running ❌{RESET}")
        return
    print(f"{YELLOW}Starting Flask app... 🚀{RESET}")
    # Run "app.py" in a subprocess (assuming app.py has "if __name__ == '__main__': app.run()")
    app_process = subprocess.Popen([sys.executable, "app.py"])
    print(f"{GREEN}✓ Flask app started ✅{RESET}")

def stop_app():
    global app_process
    if app_process is None:
        print(f"{RED}App is not running ❌{RESET}")
        return
    print(f"{YELLOW}Stopping Flask app... 💀{RESET}")
    app_process.terminate()
    app_process = None
    print(f"{GREEN}✓ Flask app stopped ✅{RESET}")

def restart_app():
    print(f"{YELLOW}Restarting Flask app... 🔄{RESET}")
    stop_app()
    start_app()

def show_menu():
    print(f"\n{YELLOW}[ App Control Menu ]{RESET}")
    print("1) Start app 🚀")
    print("2) Stop app 💀")
    print("3) Restart app 🔄")
    print("4) Quit 🚪")

def main():
    # === ASCII Banner ===
    print(f"""{GREEN}
made by Eng.Abdullah
{RESET}""")

    # === Run checks ===
    if not (check_python_version() and check_dependencies() and check_database()):
        print(f"{RED}\nChecks failed. Fix issues then try again. ❌{RESET}")
        return
    
    print(f"{GREEN}\nAll checks passed! 🎉{RESET}")

    while True:
        show_menu()
        choice = input("Choose an option (1-4): ").strip()
        if choice == "1":
            start_app()
        elif choice == "2":
            stop_app()
        elif choice == "3":
            restart_app()
        elif choice == "4":
            if app_process:  # Stop if running
                stop_app()
            print(f"{GREEN}Exiting script ✅{RESET}")
            break
        else:
            print(f"{RED}Invalid choice ❌{RESET}")

if __name__ == "__main__":
    main()
