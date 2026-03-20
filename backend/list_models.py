import os
import socket
from dotenv import load_dotenv
from google import genai

# 🌐 FORCE IPv4: This fixes the 'getaddrinfo failed' error on mobile hotspots/Windows
_original_getaddrinfo = socket.getaddrinfo
def new_getaddrinfo(*args, **kwargs):
    res = _original_getaddrinfo(*args, **kwargs)
    return [r for r in res if r[0] == socket.AF_INET]
socket.getaddrinfo = new_getaddrinfo

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# Initialize client
client = genai.Client(api_key=api_key)

models = client.models.list()  # List all available models
for m in models:
    print(m)