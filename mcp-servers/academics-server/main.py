import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mcp.server.fastmcp import FastMCP

# Load academic calendars, courses, and department contacts
current_dir = os.path.dirname(os.path.abspath(__file__))
calendar_path = os.path.join(current_dir, "data", "calendar.json")
handbook_path = os.path.join(current_dir, "data", "handbook_chunks.json")

try:
    with open(calendar_path, "r", encoding="utf-8") as f:
        calendar_data = json.load(f)
except Exception as e:
    print(f"Failed to load calendar.json: {e}")
    calendar_data = {"academic_calendar": [], "exam_schedule": [], "courses": {}, "departments": {}}

try:
    with open(handbook_path, "r", encoding="utf-8") as f:
        handbook_chunks = json.load(f)
except Exception as e:
    print(f"Failed to load handbook_chunks.json: {e}")
    handbook_chunks = []

# Initialize FastMCP
mcp = FastMCP("Academics MCP Server")

@mcp.tool()
def search_handbook(query: str) -> dict:
    """Search the Student Handbook policies (attendance, grading, curfews, violations) by keyword query."""
    q = query.strip().lower()
    results = []
    for chunk in handbook_chunks:
        if q in chunk["title"].lower() or q in chunk["content"].lower():
            results.append(chunk)
    return {
        "source": "Student Handbook Regulations (mock)",
        "query": query,
        "results": results
    }

@mcp.tool()
def get_academic_calendar() -> dict:
    """Retrieve the campus academic calendar including term starts, exams, and holidays."""
    return {
        "source": "Office of Academic Records (mock)",
        "calendar": calendar_data["academic_calendar"]
    }

@mcp.tool()
def get_exam_schedule(course_code: str = None) -> dict:
    """Retrieve exam dates, venues, and times. Optionally filter by course code (e.g. CS101)."""
    schedule = calendar_data["exam_schedule"]
    if course_code:
        c_code = course_code.strip().upper()
        schedule = [item for item in schedule if item["course_code"] == c_code]
    return {
        "source": "Controller of Examinations (mock)",
        "course_filter": course_code,
        "schedule": schedule
    }

@mcp.tool()
def get_course_info(course_code: str) -> dict:
    """Retrieve credits, prerequisites, syllabus summary, and instructor details for a specific course code (e.g. CS202)."""
    c_code = course_code.strip().upper()
    course = calendar_data["courses"].get(c_code)
    if not course:
        return {
            "source": "Academic Catalog (mock)",
            "error": f"Course code '{course_code}' not found."
        }
    return {
        "source": "Academic Catalog (mock)",
        "course_code": c_code,
        "details": course
    }

@mcp.tool()
def get_department_contact(department: str) -> dict:
    """Retrieve HOD, office location, email, and phone contact for a specific department (e.g. Computer Science)."""
    normalized_dept = department.strip().title()
    # Handle partial matches
    dept_info = None
    matched_name = None
    for name, info in calendar_data["departments"].items():
        if normalized_dept in name or name in normalized_dept:
            dept_info = info
            matched_name = name
            break
            
    if not dept_info:
        return {
            "source": "Campus Directory (mock)",
            "error": f"Department '{department}' not found."
        }
    return {
        "source": "Campus Directory (mock)",
        "department": matched_name,
        "contact": dept_info
    }

# FastAPI App Wrapping
app = FastAPI(title="Academics MCP Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/", mcp.sse_app())

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5004))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
