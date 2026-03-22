import sys
import os

# add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from utils import knowledge
print(f"Knowledge Keys: {list(knowledge.keys())}")
if 'faculty' in knowledge:
    print(f"Faculty Length: {len(knowledge['faculty'])} chars")
else:
    print("Faculty NOT found in knowledge!")

query = "Who is the HOD of Civil Engineering?"
staff_keywords = ["staff", "faculty", "professor", "hod", "head of", "who is"]
is_staff = any(k in query.lower() for k in staff_keywords)
print(f"Is Staff Test: {is_staff}")
