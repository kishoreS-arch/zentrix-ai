from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel
from utils import knowledge, get_all_knowledge, DATA_DIR, save_chat_to_json
import os
from dotenv import load_dotenv
from groq import Groq
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
import datetime
import base64
import json
from brain import brain  # 🧠 New FAISS Brain

# Load .env file
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

# ✅ Groq API Key (loaded at startup)
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("WARNING: GROQ_API_KEY not set! Chat will not work.")

def get_groq_client():
    """Returns Groq client. Raises clear error if key is missing."""
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise ValueError("GROQ_API_KEY environment variable is not set on the server.")
    return Groq(api_key=key)

app = FastAPI(title="SEC College AI Agent", version="2.0")

# 🌍 Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📦 In-memory chat history (per session, resets on restart)
chat_history: List[Dict[str, Any]] = []

HISTORY_FILE = os.path.join(DATA_DIR, "chat_history.json")

def save_chat_to_json(user_id, question, response, timestamp):
    try:
        history = []
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        history.append({
            "user_id": user_id,
            "question": question,
            "response": response,
            "timestamp": timestamp
        })
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=4)
    except Exception as e:
        print(f"Error saving chat history: {e}")

# ─────────────────────────────────────────────
# 📚 BUILD FULL KNOWLEDGE CONTEXT
# ─────────────────────────────────────────────
def build_full_context():
    """Build a single string with ALL college knowledge for the AI."""
    context = ""
    for filename, content in knowledge.items():
        context += f"\n\n=== {filename.upper()} ===\n{content}"
    return context.strip()

FULL_KNOWLEDGE = build_full_context()

# ─────────────────────────────────────────────
# 🧠 SYSTEM PROMPT — The Brain of the Agent
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are "Zentrix", the official virtual assistant for Sudharsan Engineering College (SEC), Sathiyamangalam, Pudukkottai.

YOUR STRICT RULES:
1. ONLY answer questions about SEC using the KNOWLEDGE BASE provided below.
2. If a question is NOT about SEC, politely say: "I am the SEC Engineering AI Assistant. I can only assist with college-related queries."
3. BE SHORT AND UNIQUE: Ensure your responses are extremely concise and professional. Do not repeat the question or give overly long explanations.
4. NEVER fabricate data. If information is missing, refer users to the official contact: +91 4322 291137 or info@sudharsanec.edu.in.
5. Provide specific details (fees, phone numbers, courses) exactly as listed in the knowledge base.
6. You may respond in English or Tamil.

COLLEGE KNOWLEDGE BASE:
""" + FULL_KNOWLEDGE


# ─────────────────────────────────────────────
# 📡 API MODELS
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    user_id: str = "guest"
    language: Optional[str] = "en"

class ChatResponse(BaseModel):
    response: str
    source: str  # "gemini" or "local_fallback"
    timestamp: str


# ─────────────────────────────────────────────
# 🚀 ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "online",
        "agent": "SEC College AI Agent v2.0",
        "endpoints": ["/chat", "/health", "/sources", "/history"]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "api_key_loaded": bool(os.getenv("GROQ_API_KEY")),
        "knowledge_files_loaded": len(knowledge),
        "knowledge_topics": list(knowledge.keys()),
        "timestamp": datetime.datetime.now().isoformat()
    }

print(f"✅ Backend started. Knowledge files loaded: {list(knowledge.keys())}")

@app.get("/sources")
async def get_sources():
    """Returns the list of knowledge sources loaded into the AI."""
    sources = []
    for filename, content in knowledge.items():
        sources.append({
            "name": filename,
            "preview": content[:150] + "..." if len(content) > 150 else content,
            "character_count": len(content)
        })
    return {"total_sources": len(sources), "sources": sources}

@app.get("/history")
async def get_history():
    """Returns recent chat history."""
    return {"total": len(chat_history), "history": chat_history[-50:]}


# ─────────────────────────────────────────────
# 🏷️  SMART TITLE GENERATOR
# ─────────────────────────────────────────────
class TitleRequest(BaseModel):
    user_message: str
    ai_response: str

@app.post("/generate-title")
async def generate_title(req: TitleRequest):
    """Uses Groq to produce a short, descriptive chat session title."""
    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a chat title generator. "
                        "Given a user question and the AI's answer, create a SHORT, "
                        "descriptive title (3–5 words max) that summarises the conversation topic. "
                        "Return ONLY the title — no quotes, no punctuation, no explanation."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"User asked: {req.user_message}\n"
                        f"AI answered: {req.ai_response[:300]}"
                    )
                }
            ],
            max_tokens=20,
            temperature=0.4,
        )
        title = completion.choices[0].message.content.strip()
        # Safety clamp — keep it under 50 chars
        title = title[:50] if len(title) > 50 else title
        return {"title": title}
    except Exception as e:
        # Graceful fallback
        words = req.user_message.strip().split()[:5]
        fallback = " ".join(words)
        return {"title": fallback.capitalize()}


# ─────────────────────────────────────────────
# 🔐 AUTHENTICATION (SIMPLE BACKEND LOGIN)
# ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

# Option 2: Simple Backend Login
users = {
    "kishore@gmail.com": "1234"
}

@app.post("/login")
async def login(req: LoginRequest):
    user_email = req.email.strip().lower()
    if user_email in users and users[user_email] == req.password:
        return {"user_id": user_email, "status": "success"}
    return {"status": "error", "message": "Invalid email or password"}


@app.post("/chat", response_model=ChatResponse)
async def chat(
    question: str = Form(...),
    user_id: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    user_question = question.strip()
    timestamp = datetime.datetime.now().isoformat()
    
    if not user_question and not file:
        return ChatResponse(
            response="Please enter a question or upload a file about Sudharsan Engineering College.",
            source="system",
            timestamp=timestamp
        )

    attachment_content = ""
    is_image = False
    base64_image = ""

    # 📁 Step 0: Handle Attachment
    if file:
        filename = file.filename.lower()
        file_bytes = await file.read()
        
        if filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
            is_image = True
            base64_image = base64.b64encode(file_bytes).decode('utf-8')
            attachment_content = f"\n[The user has attached an image: {filename}]"
        elif filename.endswith(('.txt', '.csv', '.py', '.md')):
            try:
                attachment_content = f"\n\n=== ATTACHED FILE: {filename} ===\n{file_bytes.decode('utf-8')[:5000]}"
            except:
                attachment_content = f"\n[Attached file {filename} could not be read as text]"
        else:
            attachment_content = f"\n[Attached file: {filename} (Binary/Unsupported for direct text extraction)]"

    # ─── Step 1: FAISS Similarity Search (RAG) ──────────────────────────────
    focused_context = brain.search(user_question, top_k=3)
    
    # Still include website context by default if needed, or let brain handle it.
    # User's FAISS should already include it.


    # ─── Step 3: Strict Grounded LLM Call  ────────────────────────────────────
    strict_system_prompt = f"""You are "Zentrix", the official AI assistant for Sudharsan Engineering College (SEC).

CRITICAL RULES FOR 100% ACCURACY:
1. ONLY answer questions about Sudharsan Engineering College (SEC) using the EXACT CONTEXT provided below. 
2. BE EXTREMELY BRIEF: Answer in maximum 2-3 lines. Be direct and relevant.
3. If the answer is NOT in the CONTEXT below, YOU MUST REPLY: "I currently do not have verified information regarding them."
4. NEVER assume, guess, or make up names, roles, or phone numbers. If it isn't explicitly in the CONTEXT, you do not know it.
5. If details are missing, refer them to +91 98434 90901 or info@sudharsanec.edu.in.

CONTEXT:
{focused_context}
{attachment_content}
"""

    try:
        # Multi-modal payload
        messages = [{"role": "system", "content": strict_system_prompt}]
        
        user_content = [{"type": "text", "text": user_question}]
        if is_image:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
            })
        
        messages.append({"role": "user", "content": user_content})

        client = get_groq_client()
        response = client.chat.completions.create(
            messages=messages,
            model="llama-3.2-11b-vision-preview" if is_image else "llama3-70b-8192",
            max_tokens=256,
            temperature=0.1,
        )
        ai_response = response.choices[0].message.content.strip()
        
        # 💾 Update History
        history_entry = {
            "user_id": user_id,
            "question": user_question,
            "answer": ai_response,
            "source": "groq_vision" if is_image else "groq",
            "timestamp": timestamp
        }
        chat_history.append(history_entry)
        save_chat_to_json(user_id, user_question, ai_response, timestamp)
        
        return ChatResponse(
            response=ai_response, 
            source=history_entry["source"], 
            timestamp=timestamp
        )

    except Exception as e:
        print(f"⚠️ Groq Error: {e}")
        fallback_msg = "I encountered an error analyzing your request. Please try again or contact SEC Admissions."
        return ChatResponse(response=fallback_msg, source="error_fallback", timestamp=timestamp)


@app.post("/reload-knowledge")
async def reload_knowledge():
    """Reload knowledge files from disk and rebuild FAISS index."""
    global knowledge, FULL_KNOWLEDGE, SYSTEM_PROMPT
    
    # 1. Reload the simple dict knowledge
    knowledge.clear()
    knowledge.update(get_all_knowledge())
    FULL_KNOWLEDGE = build_full_context()
    
    # 2. Rebuild the FAISS brain index
    brain.reload()
    
    SYSTEM_PROMPT = """You are "Zentrix", the official virtual assistant for Sudharsan Engineering College (SEC).
    
YOUR STRICT RULES:
1. ONLY answer questions about SEC using the KNOWLEDGE BASE provided.
2. If a question is NOT about SEC, politely refocus the conversation: "I am the SEC AI Assistant. I can only assist with college-related queries."
3. BE EXTREMELY BRIEF: Ensure your responses are concise and professional.
4. NEVER fabricate data. Refer users to the official contact: +91 98434 90901 or info@sudharsanec.edu.in if info is missing.
5. Provide specific details (fees, staff, courses) exactly as listed in the knowledge base.
""" + FULL_KNOWLEDGE

    return {
        "status": "reloaded", 
        "files_loaded": len(knowledge), 
        "faiss_chunks": len(brain.chunks),
        "topics": list(knowledge.keys())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)