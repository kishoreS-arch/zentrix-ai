import requests
import json

tests = [
    "Who is the HOD of Civil Engineering?",
    "List all faculty in CSE department",
    "Show EEE department staff",
    "What is the qualification of Parkavi D C?",
    "Who is Sarathbabu?",
]

results = {}
for q in tests:
    r = requests.post("http://localhost:8000/chat", data={"question": q, "user_id": "test"})
    results[q] = r.json()["response"]

output = ""
for q, ans in results.items():
    output += f"Q: {q}\nA: {ans}\n\n{'='*60}\n\n"

with open("c:\\Users\\kisho\\college-ai-agent\\live_test_results.txt", "w", encoding="utf-8") as f:
    f.write(output)

print("Test complete!")
