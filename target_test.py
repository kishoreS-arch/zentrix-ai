import requests
import time

questions = [
    "Who is the HOD of Civil Engineering?",
    "Show EEE department staff",
    "How many faculty are there in CSE department?",
    "List MBA department staff",
    "Who is DR. SARANYA DEVI?",
]

results = {}
for q in questions:
    print(f"Testing: {q}")
    for attempt in range(2):
        try:
            r = requests.post(
                "http://localhost:8000/chat",
                data={"question": q, "user_id": "test"},
                timeout=60
            )
            data = r.json()
            results[q] = data.get("response", f"ERROR: {data}")
            break
        except Exception as e:
            if attempt == 1:
                results[q] = f"TIMEOUT/ERROR: {e}"
            else:
                print(f"  Retry {q}...")
                time.sleep(3)
    time.sleep(0.5)

output = ""
for q, ans in results.items():
    output += f"Q: {q}\nA: {ans}\n\n{'='*60}\n\n"

with open("c:\\Users\\kisho\\college-ai-agent\\target_test_results.txt", "w", encoding="utf-8") as f:
    f.write(output)

print("Done! Check target_test_results.txt")
