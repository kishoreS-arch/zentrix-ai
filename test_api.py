import requests
import sys
import json

response = requests.post("http://localhost:8000/chat", data={"question": "Who is Sundarraj?", "user_id": "guest"})
data = response.json()
with open("c:\\Users\\kisho\\college-ai-agent\\api_response.txt", "w", encoding="utf-8") as f:
    f.write(data["response"])
