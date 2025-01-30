import subprocess
import sys
import pkg_resources
import os

def check_python_version():
    """Check if Python version is compatible"""
    print("Checking Python version...")
    if sys.version_info < (3, 7):
        print("Error: Python 3.7 or higher is required")
        return False
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def check_dependencies():
    """Check if all required packages are installed"""
    print("\nChecking dependencies...")
    required = {}
    
    # Read requirements from requirements.txt
    with open('requirements.txt') as f:
        for line in f:
            name, version = line.strip().split('==')
            required[name] = version
    
    missing = []
    installed = []
    
    # Check each requirement
    for package, version in required.items():
        try:
            pkg_resources.require(f"{package}=={version}")
            installed.append(f"{package} {version}")
        except (pkg_resources.DistributionNotFound, pkg_resources.VersionConflict):
            missing.append(f"{package}=={version}")
    
    if installed:
        print("✓ Found packages:")
        for pkg in installed:
            print(f"  - {pkg}")
    
    if missing:
        print("\nMissing packages:")
        for pkg in missing:
            print(f"  - {pkg}")
        
        # Attempt to install missing packages
        print("\nAttempting to install missing packages...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
            print("✓ Successfully installed missing packages")
            return True
        except subprocess.CalledProcessError:
            print("Error: Failed to install required packages")
            return False
    
    return True

def check_database():
    """Check if database file exists and is accessible"""
    print("\nChecking database...")
    db_path = 'todos.db'
    
    if not os.path.exists(db_path):
        print("Database file does not exist - it will be created on first run")
    else:
        try:
            import sqlite3
            conn = sqlite3.connect(db_path)
            conn.close()
            print("✓ Database is accessible")
        except sqlite3.Error:
            print("Error: Database file exists but cannot be accessed")
            return False
    return True

def run_application():
    """Run the Flask application"""
    print("\nStarting application...")
    try:
        import app
        app.app.run(debug=True)
    except Exception as e:
        print(f"Error starting application: {e}")
        return False
    return True

def main():
    checks = [
        check_python_version,
        check_dependencies,
        check_database
    ]
    
    # Run all checks
    for check in checks:
        if not check():
            print("\nPrerequisite checks failed. Please resolve the issues above and try again.")
            return False
    
    print("\nAll checks passed successfully!")
    
    # Run the application
    run_application()

if __name__ == "__main__":
    main()
