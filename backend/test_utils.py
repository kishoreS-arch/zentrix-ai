import sys
import os
sys.path.append(os.getcwd())
from utils import knowledge

print("Successfully loaded knowledge files:")
for key, content in knowledge.items():
    preview = content[:50].replace('\n', ' ') + "..." if content else "EMPTY"
    print(f"- {key}: {preview}")
