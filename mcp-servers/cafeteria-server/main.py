import os
import json
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mcp.server.fastmcp import FastMCP

# Load menu mock data
current_dir = os.path.dirname(os.path.abspath(__file__))
menu_path = os.path.join(current_dir, "data", "menu.json")

try:
    with open(menu_path, "r", encoding="utf-8") as f:
        menu_data = json.load(f)
except Exception as e:
    print(f"Failed to load menu.json: {e}")
    menu_data = {"days": {}, "specials": [], "timings": {}, "item_nutrition": {}}

# Create FastMCP instance
mcp = FastMCP("Cafeteria MCP Server")

@mcp.tool()
def get_today_menu() -> dict:
    """Retrieve today's cafeteria menu with breakfast, lunch, snacks, and dinner options."""
    day_name = datetime.now().strftime("%A")
    day_menu = menu_data["days"].get(day_name, menu_data["days"]["Monday"])
    return {
        "source": "Campus Cafeteria Board (mock)",
        "day": day_name,
        "menu": day_menu
    }

@mcp.tool()
def get_weekly_menu() -> dict:
    """Retrieve the full 7-day weekly menu grid."""
    return {
        "source": "Campus Cafeteria Board (mock)",
        "weekly_menu": menu_data["days"]
    }

@mcp.tool()
def get_menu_by_day(day: str) -> dict:
    """Retrieve the menu items for a specific day of the week (e.g. Monday, Tuesday, Sunday)."""
    day_formatted = day.strip().capitalize()
    if day_formatted not in menu_data["days"]:
        return {
            "source": "Campus Cafeteria Board (mock)",
            "error": f"Invalid day '{day}'. Please provide a valid day of the week (e.g. Monday)."
        }
    return {
        "source": "Campus Cafeteria Board (mock)",
        "day": day_formatted,
        "menu": menu_data["days"][day_formatted]
    }

@mcp.tool()
def get_special_offers() -> dict:
    """Retrieve today's special deals, discounts, and promotional offers at the cafeteria."""
    return {
        "source": "Campus Cafeteria Board (mock)",
        "specials": menu_data["specials"]
    }

@mcp.tool()
def get_item_nutrition(item_name: str) -> dict:
    """Look up nutritional information (calories, protein, carbs, fat, allergens) for a specific food item."""
    name_lower = item_name.strip().lower()
    for name, data in menu_data["item_nutrition"].items():
        if name.lower() == name_lower:
            return {
                "source": "Campus Nutrition Guide (mock)",
                "item": name,
                "nutrition": data
            }
    return {
        "source": "Campus Nutrition Guide (mock)",
        "item": item_name,
        "message": f"Nutrition info not found in registry for '{item_name}'."
    }

@mcp.tool()
def get_mess_timings() -> dict:
    """Retrieve the standard operational hours for breakfast, lunch, snacks, and dinner."""
    return {
        "source": "Campus Cafeteria Board (mock)",
        "timings": menu_data["timings"]
    }

# Create core FastAPI application
app = FastAPI(title="Cafeteria MCP Service")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the MCP server's SSE application at the root
app.mount("/", mcp.sse_app())

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5002))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
