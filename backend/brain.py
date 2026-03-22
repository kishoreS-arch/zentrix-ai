"""
Lightweight Knowledge Engine using TF-IDF + BM25-style search.
Replaces sentence-transformers + FAISS to stay within Render free tier memory limits (512MB).
No model downloads required — pure Python, fast startup.
"""

import os
import math
import re
from typing import List, Dict
from collections import defaultdict


def tokenize(text: str) -> List[str]:
    """Simple tokenizer: lowercase, remove punctuation, split on whitespace."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return [w for w in text.split() if len(w) > 1]


class KnowledgeEngine:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.chunks: List[str] = []
        self._index: Dict[str, List[int]] = defaultdict(list)   # term -> [chunk_ids]
        self._tf: List[Dict[str, float]] = []                    # TF per chunk
        self._idf: Dict[str, float] = {}                         # IDF per term
        self.load_and_index()

    # ── Data Loading ────────────────────────────────────────────────────────
    def load_and_index(self):
        """Load all .txt files from data_dir and build TF-IDF index."""
        if not os.path.exists(self.data_dir):
            print(f"⚠️  Data directory not found: {self.data_dir}")
            return

        total_files = 0
        for filename in sorted(os.listdir(self.data_dir)):
            if not filename.endswith(".txt"):
                continue
            filepath = os.path.join(self.data_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                if not content:
                    continue

                # Split into segments on blank lines
                segments = [s.strip() for s in content.split("\n\n") if len(s.strip()) > 10]

                for seg in segments:
                    if len(seg) < 700:
                        self.chunks.append(seg)
                    else:
                        # Sliding window for large segments
                        words = seg.split()
                        chunk_size, overlap = 100, 30
                        for i in range(0, len(words), chunk_size - overlap):
                            chunk = " ".join(words[i: i + chunk_size])
                            if len(chunk) > 20:
                                self.chunks.append(chunk)

                total_files += 1
            except Exception as e:
                print(f"⚠️  Error loading {filename}: {e}")

        print(f"📚 Loaded {total_files} knowledge files, {len(self.chunks)} total chunks.")

        if not self.chunks:
            print("⚠️  No knowledge chunks found!")
            return

        self._build_index()

    # ── Index Building ───────────────────────────────────────────────────────
    def _build_index(self):
        """Build TF and IDF tables for BM25-style retrieval."""
        N = len(self.chunks)
        doc_freq: Dict[str, int] = defaultdict(int)

        for cid, chunk in enumerate(self.chunks):
            tokens = tokenize(chunk)
            freq: Dict[str, int] = defaultdict(int)
            for t in tokens:
                freq[t] += 1
            total = max(len(tokens), 1)
            tf = {t: c / total for t, c in freq.items()}
            self._tf.append(tf)
            for t in freq:
                doc_freq[t] += 1
                self._index[t].append(cid)

        # IDF with smoothing
        self._idf = {
            t: math.log((N + 1) / (df + 1)) + 1
            for t, df in doc_freq.items()
        }
        print(f"✅ TF-IDF index built: {len(self.chunks)} chunks, {len(self._idf)} unique terms.")

    # ── Search ───────────────────────────────────────────────────────────────
    def search(self, query: str, top_k: int = 15, threshold: float = 0.0) -> str:
        """
        BM25-style TF-IDF search.
        Returns top_k most relevant chunks joined by double newline.
        """
        if not self.chunks:
            return ""

        query_tokens = tokenize(query)
        if not query_tokens:
            return ""

        scores: Dict[int, float] = defaultdict(float)

        for token in query_tokens:
            idf = self._idf.get(token, 0.0)
            if idf == 0.0:
                continue
            for cid in self._index.get(token, []):
                tf = self._tf[cid].get(token, 0.0)
                scores[cid] += tf * idf

        if not scores:
            return ""

        # Sort by score descending
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        # Deduplicate by first 50 chars
        seen = set()
        results = []
        for cid, score in ranked[:top_k * 2]:
            if score < threshold:
                continue
            key = self.chunks[cid][:50].lower().strip()
            if key not in seen:
                seen.add(key)
                results.append(self.chunks[cid])
            if len(results) >= top_k:
                break

        return "\n\n".join(results)

    # ── Reload ───────────────────────────────────────────────────────────────
    def reload(self):
        """Reload all knowledge files and rebuild the index."""
        self.chunks = []
        self._index = defaultdict(list)
        self._tf = []
        self._idf = {}
        self.load_and_index()


# ── Global Instance ──────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "data")
brain = KnowledgeEngine(DATA_PATH)
