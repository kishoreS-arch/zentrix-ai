import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List

# Initialize the encoder model (fast + efficient)
encoder = SentenceTransformer('all-MiniLM-L6-v2')

class KnowledgeEngine:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.chunks: List[str] = []
        self.index = None
        self.load_and_index()

    def load_and_index(self):
        """Loads all .txt files from the data directory and creates FAISS index."""
        if not os.path.exists(self.data_dir):
            print(f"⚠️ Error: Data directory {self.data_dir} not found.")
            return

        total_files = 0
        for filename in sorted(os.listdir(self.data_dir)):
            if filename.endswith(".txt"):
                filepath = os.path.join(self.data_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read().strip()
                        if not content:
                            continue
                            
                        # Split by double newline for basic segments
                        segments = [s.strip() for s in content.split("\n\n") if len(s.strip()) > 10]
                        
                        # Apply sliding window for overlapping chunks (ensures context preservation)
                        # We want chunks of ~500 chars with ~200 chars overlap
                        for seg in segments:
                            if len(seg) < 700:
                                self.chunks.append(seg)
                            else:
                                # Break large segments into overlapping chunks
                                words = seg.split()
                                chunk_size = 100 # words
                                overlap = 30 # words
                                for i in range(0, len(words), chunk_size - overlap):
                                    chunk = " ".join(words[i:i + chunk_size])
                                    if len(chunk) > 20:
                                        self.chunks.append(chunk)
                                        
                        total_files += 1
                except Exception as e:
                    print(f"⚠️ Error loading {filename}: {e}")

        print(f"📚 Loaded {total_files} knowledge files, {len(self.chunks)} total chunks.")

        if not self.chunks:
            print("⚠️ No knowledge chunks found!")
            return

        # Encode all chunks
        embeddings = encoder.encode(self.chunks, show_progress_bar=False)

        # Normalize for cosine similarity
        faiss.normalize_L2(embeddings)
        embeddings = np.array(embeddings).astype('float32')

        dimension = embeddings.shape[1]
        # IndexFlatIP with normalized vectors = Cosine Similarity
        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(embeddings)
        print(f"✅ FAISS index built with {len(self.chunks)} chunks (dim={dimension}).")

    def search(self, query: str, top_k: int = 8, threshold: float = 0.25) -> str:
        """
        Search FAISS index using Cosine Similarity.
        - top_k: increased to 8 for better coverage
        - threshold: lowered to 0.25 to catch more relevant matches
        """
        if not self.index or not self.chunks:
            return ""

        query_embedding = encoder.encode([query])
        faiss.normalize_L2(query_embedding)
        query_embedding = query_embedding.astype('float32')

        similarities, indices = self.index.search(query_embedding, top_k)

        results = []
        for i, idx in enumerate(indices[0]):
            score = float(similarities[0][i])
            if idx != -1 and score >= threshold:
                results.append(self.chunks[idx])

        # Deduplicate and sort by relevance
        seen = set()
        unique_results = []
        for r in results:
            # use hash of first part to avoid near-duplicates
            key = r[:50].lower().strip()
            if key not in seen:
                seen.add(key)
                unique_results.append(r)

        return "\n\n".join(unique_results)

    def reload(self):
        """Reload all knowledge files and rebuild the index."""
        self.chunks = []
        self.index = None
        self.load_and_index()


# ── Global Instance ──────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "data")
brain = KnowledgeEngine(DATA_PATH)
