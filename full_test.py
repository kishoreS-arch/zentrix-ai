import requests
import time

tests = [
    # HOD Queries
    ("HOD", "Who is the HOD of Civil Engineering?"),
    ("HOD", "Who is the HOD of CSE?"),
    ("HOD", "Who is the HOD of EEE?"),
    ("HOD", "Who is the HOD of Mechanical Engineering?"),
    ("HOD", "Who is the HOD of AI & ML?"),
    ("HOD", "Who is the HOD of Data Science?"),
    # List Queries (use 70B)
    ("LIST", "List all faculty in Civil Engineering"),
    ("LIST", "Show CSE department staff"),
    ("LIST", "List EEE staff"),
    ("LIST", "Show ECE department faculty"),
    ("LIST", "List Mechanical Engineering staff"),
    ("LIST", "Show AI & ML department staff"),
    ("LIST", "Show MBA department staff"),
    ("LIST", "List Chemistry department staff"),
    # Who Is Queries
    ("WHO", "Who is Sundarraj S?"),
    ("WHO", "Who is Sarathbabu?"),
    ("WHO", "Who is John Joseph?"),
    ("WHO", "Who is Kavitha R?"),
    ("WHO", "Who is Abbas Ali?"),
    # Qualification
    ("QUAL", "What is the qualification of Sujatha P?"),
    ("QUAL", "What is the qualification of Parkavi D C?"),
]

output = ""
for cat, q in tests:
    for attempt in range(2):
        try:
            r = requests.post(
                "http://localhost:8000/chat",
                data={"question": q, "user_id": "test"},
                timeout=35
            )
            ans = r.json().get("response", "ERROR")
            output += f"[{cat}] Q: {q}\nA: {ans}\n\n"
            break
        except Exception as e:
            if attempt == 1:
                output += f"[{cat}] Q: {q}\nA: TIMEOUT/ERROR - {e}\n\n"
            else:
                time.sleep(2)
    time.sleep(0.5)   # small gap between requests

with open("c:\\Users\\kisho\\college-ai-agent\\full_test_results.txt", "w", encoding="utf-8") as f:
    f.write(output)

print("Done!")
