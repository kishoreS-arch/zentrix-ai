import os
import sys
sys.path.append(r"c:\Users\kisho\college-ai-agent\backend")
from brain import brain
print("Brain loaded successfully")
print(f"Chunks: {len(brain.chunks)}")
query = "AI and DS staff"
results = brain.search(query, top_k=5)
print("Search results:")
print(results)
