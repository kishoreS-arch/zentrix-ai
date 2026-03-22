import sys
import os

sys.path.append('c:\\Users\\kisho\\college-ai-agent\\backend')
from brain import brain

query = "Who is Sundarraj?"
results = brain.search(query, top_k=15)
with open('c:\\Users\\kisho\\college-ai-agent\\test_query_out.txt', 'w', encoding='utf-8') as f:
    f.write("Query: " + query + "\n")
    f.write("Results:\n")
    f.write(results + "\n")

    query2 = "Tell me about staff in civil engineering."
    results2 = brain.search(query2, top_k=15)
    f.write("\nQuery 2: " + query2 + "\n")
    f.write("Results 2:\n")
    f.write(results2 + "\n")
