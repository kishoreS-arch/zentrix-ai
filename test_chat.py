from groq import Groq
import sys
import os
sys.path.append('c:\\Users\\kisho\\college-ai-agent\\backend')
from utils import knowledge
from brain import brain

os.environ['GROQ_API_KEY'] = 'gsk_58e11124233e' # Wait I don't know the groq key. I will just rely on the existing .env file.
# The user's repo has a .env file.
from dotenv import load_dotenv
load_dotenv('c:\\Users\\kisho\\college-ai-agent\\backend\\.env')

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

user_question = "Who is Sundarraj?"
focused_context = brain.search(user_question, top_k=15)
query_lower = user_question.lower()
staff_keywords = ["staff", "faculty", "professor", "hod", "who is", "principal", "dr.", "mr.", "mrs."]
if any(k in query_lower for k in staff_keywords):
    if "faculty" in knowledge:
        focused_context = f"--- COMPLETE FACULTY & STAFF DIRECTORY ---\n{knowledge['faculty']}\n\n--- SEARCH RESULTS ---\n" + focused_context

prompt = f"""You are "Zentrix", the AI assistant.
CRITICAL RULE:
1. Use exact context.
CONTEXT:
{focused_context[:2000]} # printing just 2000 chars to avoid very long log
"""
print("Context snippets injected:", "SUNDARRAJ.S" in focused_context)
