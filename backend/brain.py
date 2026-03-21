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

        for filename in os.listdir(self.data_dir):
            if filename.endswith(".txt"):
                with open(os.path.join(self.data_dir, filename), "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
                        for p in paragraphs:
                            self.chunks.append(p)
        
        if not self.chunks:
            return

        embeddings = encoder.encode(self.chunks)
        # Normalize for cosine similarity
        faiss.normalize_L2(embeddings)
        embeddings = np.array(embeddings).astype('float32')

        dimension = embeddings.shape[1]
        # Use Inner Product for normalized vectors = Cosine Similarity
        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(embeddings)
        print(f"✅ Indexed {len(self.chunks)} knowledge chunks into FAISS with Cosine Similarity.")

    def search(self, query: str, top_k: int = 3, threshold: float = 0.75) -> str:
        """Search FAISS index using Cosine Similarity. Filters by threshold (0.75+) as requested."""
        if not self.index:
            return ""

        query_embedding = encoder.encode([query])
        faiss.normalize_L2(query_embedding)
        query_embedding = query_embedding.astype('float32')

        # distances here are cosine similarity scores [-1, 1]
        similarities, indices = self.index.search(query_embedding, top_k)

        results = []
        for i, idx in enumerate(indices[0]):
            score = similarities[0][i]
            if idx != -1 and score >= threshold:
                results.append(self.chunks[idx])
        
        return "\n\n".join(results)

# Create a global instance for the backend to use
DATA_PATH = os.path.join(os.path.dirname(__file__), "data")
brain = KnowledgeEngine(DATA_PATH)
