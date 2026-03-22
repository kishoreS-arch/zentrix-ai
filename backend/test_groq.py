import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv(r"c:\Users\kisho\college-ai-agent\backend\.env")
api_key = os.getenv("GROQ_API_KEY")

print(f"Testing Groq Key: {api_key[:10]}...")

try:
    client = Groq(api_key=api_key)
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "Test",
            }
        ],
        model="llama3-8b-8192",
    )
    print("Groq working!")
    print(chat_completion.choices[0].message.content)
except Exception as e:
    print(f"Groq Error: {e}")
