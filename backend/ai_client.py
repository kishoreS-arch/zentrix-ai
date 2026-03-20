# backend/ai_client.py
import os
import socket
from dotenv import load_dotenv
from google.genai import Client

# 🌐 FORCE IPv4: This fixes the 'getaddrinfo failed' error on mobile hotspots/Windows
_original_getaddrinfo = socket.getaddrinfo
def new_getaddrinfo(*args, **kwargs):
    res = _original_getaddrinfo(*args, **kwargs)
    return [r for r in res if r[0] == socket.AF_INET]
socket.getaddrinfo = new_getaddrinfo

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# Initialize client cleanly
client = Client(api_key=api_key)

def ask_ai(question: str) -> str:
    """
    Sends the question to the AI model and returns the response text.
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite-001",
            contents=question
        )
        return response.text or "No response from AI."
    except Exception as e:
        return f"Error: {str(e)}"