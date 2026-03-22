import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv(r"c:\Users\kisho\college-ai-agent\backend\.env")
api_key = os.getenv("GROQ_API_KEY")

def test_model(model):
    try:
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": "Test"}],
            model=model,
        )
        print(f"Model {model} works!")
        return True
    except Exception as e:
        print(f"Model {model} Error: {e}")
        return False

# Test common Groq models
models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"]
for m in models:
    if test_model(m):
        break
