import os
import glob

# Get the folder where utils.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Data is at the root directory (outside backend/)
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "data")

def get_all_knowledge():
    """
    Automatically loads all .txt files from the data directory.
    Returns a dictionary where key is filename (without .txt) and value is content.
    """
    knowledge_db = {}
    if not os.path.exists(DATA_DIR):
        print(f"Warning: Data directory not found at {DATA_DIR}")
        return knowledge_db

    # Find all .txt files
    txt_files = glob.glob(os.path.join(DATA_DIR, "*.txt"))
    
    for file_path in txt_files:
        try:
            filename = os.path.basename(file_path).replace(".txt", "").lower()
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    knowledge_db[filename] = content
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            
    return knowledge_db

# Load once at startup
knowledge = get_all_knowledge()