from fastapi import FastAPI
from pydantic import BaseModel
from utils import knowledge, get_all_knowledge, DATA_DIR
import os
from dotenv import load_dotenv
from groq import Groq
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import datetime
import socket
import json

# Load .env file
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

# ✅ Groq Client
client = Groq(api_key=api_key)

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
chat_history = []

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
SYSTEM_PROMPT = """You are "SEC AI", the official virtual assistant for Sudharsan Engineering College (SEC), located in Sathiyamangalam, Pudukkottai, Tamil Nadu.

YOUR STRICT RULES:
1. ONLY answer questions related to Sudharsan Engineering College using the KNOWLEDGE BASE provided below.
2. If a question is NOT about the college, politely say: "I'm the SEC College AI Assistant. I can only help with questions about Sudharsan Engineering College — like admissions, fees, departments, placements, events, rules, and contact info."
3. NEVER fabricate data. If the answer is not in the knowledge base, say: "I don't have that specific information right now. Please contact the college office at info@sudharsanec.edu.in or call +91 4322 123456."
4. Be friendly, professional, and concise.
5. When listing information, use bullet points or numbered lists for clarity.
6. You may respond in English or Tamil based on the user's language.
7. Format important details (phone numbers, emails, dates) clearly.

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
        "api_key_loaded": bool(api_key),
        "knowledge_files_loaded": len(knowledge),
        "knowledge_topics": list(knowledge.keys()),
        "timestamp": datetime.datetime.now().isoformat()
    }

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
async def chat(req: ChatRequest):
    user_question = req.question.strip()
    timestamp = datetime.datetime.now().isoformat()
    
    if not user_question:
        return ChatResponse(
            response="Please enter a question about Sudharsan Engineering College.",
            source="system",
            timestamp=timestamp
        )

    # Language instruction for API
    lang_instruction = ""
    if req.language and req.language.lower() in ["ta", "tamil"]:
        lang_instruction = "\n\nIMPORTANT: Respond in Tamil language."

    # 🌟 1. LOCAL SEARCH FIRST
    user_lower = user_question.lower()
    STOP_WORDS = {"what", "are", "the", "tell", "me", "about", "who", "is", "how", "many", "does", "in", "of", "for", "and", "to", "a", "an", "college", "sec", "can", "you", "give", "details", "some", "at"}
    
    # Extract meaningful keywords for fuzzy search
    words = [w.strip("?.!") for w in user_lower.split() if w.strip("?.!") not in STOP_WORDS and len(w.strip("?.!")) > 2]
    
    local_scores = []
    for filename, content in knowledge.items():
        score = 0
        content_lower = content.lower()
        
        # High priority: Filename matches
        keyword = filename[:-1] if filename.endswith('s') else filename
        if filename in user_lower or keyword in user_lower:
            score += 10
            
        # Keyword matches
        for w in words:
            if w in content_lower:
                score += 1
                
        if score > 0:
            local_scores.append((score, filename, content))

    # If we found local data, return the best matches IMMEDIATELY without hitting the API
    if local_scores:
        # Sort by best match
        local_scores.sort(key=lambda x: x[0], reverse=True)
        # Take top 2 matches at most to keep it concise
        top_matches = local_scores[:2]
        
        local_response_parts = ["Here is the information from our records:"]
        for score, filename, content in top_matches:
            # Clean up the content lightly for chat
            lines = [line.strip() for line in content.split('\n') if line.strip()]
            
            # Try to find relevant lines based on keywords
            relevant_lines = []
            for line in lines:
                for w in words:
                    if w in line.lower():
                        relevant_lines.append(line)
                        break
                if len(relevant_lines) >= 4:
                    break
            
            # Fallback to first lines if no relevant lines found or too few
            if len(relevant_lines) < 2:
                relevant_lines = lines[:4]
                
            short_content = '\n'.join(relevant_lines)
            local_response_parts.append(f"\n**From {filename.replace('.txt', '').title()}**:\n{short_content}")
        
        local_response = "\n".join(local_response_parts)
        
        chat_history.append({
            "user_id": req.user_id,
            "question": user_question,
            "answer": local_response,
            "source": "local_data",
            "timestamp": timestamp
        })
        save_chat_to_json(req.user_id, user_question, local_response, timestamp)
        
        return ChatResponse(response=local_response, source="local_data", timestamp=timestamp)

    # 🌟 2. FALLBACK TO API
    prompt = f"User Question: {user_question}{lang_instruction}"
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
        )
        ai_response = response.choices[0].message.content.strip()
        
        chat_history.append({
            "user_id": req.user_id,
            "question": user_question,
            "answer": ai_response,
            "source": "groq",
            "timestamp": timestamp
        })
        save_chat_to_json(req.user_id, user_question, ai_response, timestamp)
        
        return ChatResponse(response=ai_response, source="groq", timestamp=timestamp)

    except Exception as e:
        error_msg = str(e)
        print(f"⚠️ Groq API Error: {error_msg}")
        
        # 🌟 3. FALLBACK MESSAGING (Quota / Error)
        fallback_msg = "Please try again later"
        
        chat_history.append({
            "user_id": req.user_id,
            "question": user_question,
            "answer": fallback_msg,
            "source": "error_fallback",
            "timestamp": timestamp
        })
        save_chat_to_json(req.user_id, user_question, fallback_msg, timestamp)
        
        return ChatResponse(response=fallback_msg, source="error_fallback", timestamp=timestamp)


@app.post("/reload-knowledge")
async def reload_knowledge():
    """Reload knowledge files from disk (admin feature)."""
    global knowledge, FULL_KNOWLEDGE, SYSTEM_PROMPT
    knowledge.clear()
    knowledge.update(get_all_knowledge())
    FULL_KNOWLEDGE = build_full_context()
    SYSTEM_PROMPT = """You are "SEC AI", the official AI assistant for Sudharsan Engineering College (SEC), located in Sathiyamangalam, Pudukkottai, Tamil Nadu.

YOUR STRICT RULES:
1. ONLY answer questions related to Sudharsan Engineering College using the KNOWLEDGE BASE provided below.
2. If a question is NOT about the college, politely say: "I'm the SEC College AI Assistant. I can only help with questions about Sudharsan Engineering College — like admissions, fees, departments, placements, events, rules, and contact info."
3. NEVER fabricate data. If the answer is not in the knowledge base, say: "I don't have that specific information right now. Please contact the college office at info@sudharsanec.edu.in or call +91 4322 123456."
4. Be friendly, professional, and concise.
5. When listing information, use bullet points or numbered lists for clarity.
6. You may respond in English or Tamil based on the user's language.
7. Format important details (phone numbers, emails, dates) clearly.

COLLEGE KNOWLEDGE BASE:
""" + FULL_KNOWLEDGE
    return {"status": "reloaded", "files_loaded": len(knowledge), "topics": list(knowledge.keys())}