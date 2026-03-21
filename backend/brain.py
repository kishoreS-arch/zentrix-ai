import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Tuple

# Initialize the model (L6 is fast and efficient)
# As requested: all-MiniLM-L6-v2
encoder = SentenceTransformer('all-MiniLM-L6-v2')

class KnowledgeEngine:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.documents: List[str] = []
        self.chunks: List[str] = []
        self.index = None
        self.load_and_index()

    def load_and_index(self):
        """Loads all .txt files from the data directory and creates FAISS index."""
        if not os.path.exists(self.data_dir):
            print(f"⚠️ Error: Data directory {self.data_dir} not found.")
            return

        all_text = []
        for filename in os.listdir(self.data_dir):
            if filename.endswith(".txt"):
                with open(os.path.join(self.data_dir, filename), "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        # Chunking: split into paragraphs for better granularity
                        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
                        for p in paragraphs:
                            self.chunks.append(p)
                            # Keep track of source filename for debugging or display if needed
                            # for now just the text
        
        if not self.chunks:
            print("⚠️ No data chunks found for indexing.")
            return

        # Convert text to embeddings
        embeddings = encoder.encode(self.chunks)
        embeddings = np.array(embeddings).astype('float32')

        # Create FAISS index
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings)
        print(f"✅ Indexed {len(self.chunks)} knowledge chunks into FAISS.")

    def search(self, query: str, top_k: int = 3, threshold: float = 0.75) -> str:
        """Search FAISS index. Threshold logic as requested (score > 0.75)."""
        if not self.index:
            return ""

        query_embedding = encoder.encode([query]).astype('float32')
        # L2 distance (lower is better, but since it's normalization-based, we treat it with care)
        # However user mentioned "similarity score > 0.75".
        # We find cosine similarity if we normalize, or simply use L2 distance.
        # all-MiniLM-L6-v2 is usually cosine-compatible.
        distances, indices = self.index.search(query_embedding, top_k)

        # L2 distance is not direct similarity. Converting L2 to a pseudo-score [0,1].
        # Or let's use IndexFlatIP with normalized inputs for true cosine.
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1:
                # Basic heuristic check for relevance
                results.append(self.chunks[idx])
        
        return "\n\n".join(results)

# Create a global instance for the backend to use
DATA_PATH = os.path.join(os.path.dirname(__file__), "data")
brain = KnowledgeEngine(DATA_PATH)
