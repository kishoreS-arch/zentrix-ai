from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel
from utils import knowledge, get_all_knowledge, DATA_DIR
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


@app.get("/debug-knowledge")
async def debug_knowledge():
    return {
        "keys": list(knowledge.keys()),
        "faculty_loaded": "faculty" in knowledge,
        "faculty_len": len(knowledge.get("faculty", "")) if "faculty" in knowledge else 0,
        "is_staff_test": "hod" in "who is the hod",
        "data_dir": DATA_DIR
    }

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
    focused_context = brain.search(user_question, top_k=15)
    
    # ─── Step 2: 100% Faculty Query Accuracy (Full Injection for Staff Questions) ─
    query_lower = user_question.lower()
    staff_keywords = [
        "staff", "faculty", "professor", "hod", "head of", "who is", "who are",
        "principal", "dr.", "mr.", "mrs.", "ms.", "teaches", "department",
        "list", "show", "civil", "cse", "eee", "ece", "mechanical", "ai & ml",
        "aiml", "data science", "ai & ds", "aids", "mba", "chemistry", "physics",
        "mathematics", "english", "tamil", "qualification", "designation", "associate",
        "assistant", "technical", "teaching", "count", "how many"
    ]
    is_staff_query = any(k in query_lower for k in staff_keywords)
    
    # Detect if it's a LIST / TABLE request (needs smarter model)
    table_keywords = ["list", "show", "all faculty", "all staff", "department staff", "department faculty"]
    is_table_query = any(k in query_lower for k in table_keywords)
    
    print(f"DEBUG: User asked '{user_question}'")
    print(f"DEBUG: is_staff_query={is_staff_query}, is_table_query={is_table_query}")

    if is_staff_query and "faculty" in knowledge:
        faculty_text = knowledge["faculty"]
        lines = [line.strip() for line in faculty_text.split("\n") if line.strip().startswith("- Staff Name:")]
        
        # Determine target department keywords
        requested_depts = []
        dept_map = {
            "civil": ["civil"],
            "cse": ["computer science and engineering (cse)", "m.e computer science"],
            "eee": ["electrical and electronics engineering"],
            "ece": ["electronics and communication engineering"],
            "mech": ["mechanical engineering"],
            "ai & ml": ["artificial intelligence and machine learning (ai & ml)"],
            "aiml": ["artificial intelligence and machine learning (ai & ml)"],
            "ai & ds": ["artificial intelligence and data science (ai & ds)"],
            "aids": ["artificial intelligence and data science (ai & ds)"],
            "mba": ["master of business administration"],
            "chemistry": ["chemistry"],
            "physics": ["physics"],
            "math": ["mathematics"],
            "english": ["english"],
            "tamil": ["tamil"]
        }
        
        for key, aliases in dept_map.items():
            if key in query_lower:
                requested_depts.extend(aliases)
        
        # Deduplicate targets
        requested_depts = list(set(requested_depts))
        
        relevant_staff = []
        if requested_depts:
            print(f"DEBUG: Targeted query for {requested_depts}")
            for line in lines:
                # Rule: Check if line's 'Department:' field specifically matches any of our requested departments
                parts = line.split("|")
                dept_field = ""
                for p in parts:
                    if "Department:" in p:
                        dept_field = p.replace("Department:", "").strip().lower()
                        break
                
                # If the line's department field exactly matches one of our target strings
                if any(target in dept_field for target in requested_depts):
                    relevant_staff.append(line)
        else:
            # Fallback for generic 'list staff' or 'who is Dr. X' queries: inject all
            print("DEBUG: Generic staff query, injecting full directory for discovery.")
            relevant_staff = lines

        if relevant_staff:
            count = len(relevant_staff)
            print(f"DEBUG: Injecting {count} relevant staff members into context.")
            staff_context = "\n".join(relevant_staff)
            
            # CRITICAL: For targeted department queries, we CLEAR the FAISS context
            # to prevent 'noisy' matches (like AI & ML staff who have 'Computer Science' in their qualifications)
            # from confusing the AI.
            if requested_depts:
                print("DEBUG: Clearing FAISS context to ensure ZERO overlap for targeted dept query.")
                focused_context = ""
                
            focused_context = f"--- VERIFIED STAFF LIST FOR {', '.join(requested_depts).upper() if requested_depts else 'COLLEGE'} ---\n{staff_context}\n\n" + (f"--- ADDITIONAL SEARCH RESULTS ---\n{focused_context}" if focused_context else "")

    # 📁 Save context for debugging
    with open("last_context_debug.txt", "w", encoding="utf-8") as f:
        f.write(focused_context)


    # ─── Step 3: Strict Grounded LLM Call  ────────────────────────────────────
    strict_system_prompt = f"""You are "Zentrix", the official AI assistant for Sudharsan Engineering College (SEC), Sathiyamangalam, Pudukkottai.

CRITICAL RULES FOR 100% ACCURACY:
1. ONLY answer using the EXACT CONTEXT provided below. Do NOT hallucinate or assume any information.
2. CSE, AI & ML, and AI & DS are THREE COMPLETELY SEPARATE departments. If the context segment is labeled 'VERIFIED STAFF LIST FOR CSE', then DO NOT include any person whose record does not appear in that exact section. 
3. NEVER make up names, qualifications, designations, or phone numbers.
4. If the answer is NOT found in the CONTEXT, reply ONLY: "I currently do not have verified information regarding this."
5. If info is missing, refer to: +91 98434 90901 | info@sudharsanec.edu.in

FORMATTING RULES (MANDATORY):
- When asked to LIST or SHOW staff/faculty for a department → always return a NUMBERED MARKDOWN TABLE with exactly these columns: S.No | Name | Designation.
- You MUST include the header separator line (e.g., |---|---|---|) so it renders correctly as a table.
- When asked WHO IS a person → reply in 1-2 professional sentences: their full name, designation, and department.
- When asked for QUALIFICATION → list their qualifications clearly in a professional sentence.
- When asked to list HODs → return a clean table: Department | HOD Name
- When asked for FACULTY COUNT → state the count and then list the names in a numbered list.
- Always use FULL PROPER NAMES with prefixes (Mr., Mrs., Ms., Dr.) exactly as given in the context.
- Format names in TITLE CASE (e.g., "Mr. Sundarraj S", not "MR. SUNDARRAJ S").

EXAMPLE RESPONSE FORMATS:

Q: Who is the HOD of Civil Engineering?
A: Mr. Sundarraj S is the Head of the Department (HOD) of B.E Civil Engineering at Sudharsan Engineering College. He holds a B.E. in Civil Engineering and an M.E. in Structural Engineering.

Q: List all faculty in CSE
A:
| S.No | Name | Designation |
|---|---|---|
| 1 | Dr. Sujatha P | Professor & HOD |
| 2 | Mrs. Parvathi P | Associate Professor |
| 3 | Mrs. Aarthi M | Assistant Professor |
...

Q: What is the qualification of Parkavi D C?
A: Ms. Parkavi D C holds a B.E. in Civil Engineering, an M.E. in Structural Engineering, and is pursuing a Ph.D. in Structural Engineering.

CONTEXT:
{focused_context}
{attachment_content}
"""

    try:
        user_content = [{"type": "text", "text": user_question}]
        if is_image:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
            })

        messages = [
            {"role": "system", "content": strict_system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        # Add a hidden instruction at the end to force formatting
        if is_staff_query:
            messages.append({"role": "system", "content": "MANDATORY: Follow the formatting rules exactly. If it's a list, use a MARKDOWN TABLE with |---|---|---| separators. Start your answer with 'ZENTRIX-V2: '"})
        else:
            messages.append({"role": "system", "content": "Start your answer with 'ZENTRIX-V2: '"})

        client = get_groq_client()
        # Smart model routing:
        # - Images: vision model
        # - List/table requests: 70B model for perfect table formatting
        # - Who-is / qualification / count: fast 8B (avoids timeout, still has full context)
        if is_image:
            selected_model = "llama-3.2-11b-vision-preview"
        elif is_table_query:
            selected_model = "llama-3.3-70b-versatile"   # Best for formatted tables
        else:
            selected_model = "llama-3.1-8b-instant"       # Fast for who-is / qual queries

        try:
            response = client.chat.completions.create(
                messages=messages,
                model=selected_model,
                max_tokens=1024,
                temperature=0.1,
                timeout=40,
            )
        except Exception as e:
            # Fallback to 8B if 70B fails or hits rate limit
            if selected_model == "llama-3.3-70b-versatile":
                print(f"70B Model failed ({e}), falling back to 8B model...")
                response = client.chat.completions.create(
                    messages=messages,
                    model="llama-3.1-8b-instant",
                    max_tokens=1024,
                    temperature=0.1,
                    timeout=20,
                )
            else:
                raise e

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
        import traceback
        print(f"⚠️ Groq Error: {e}")
        traceback.print_exc()
        fallback_msg = f"I encountered an error analyzing your request. Error: {str(e)[:100]}"
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