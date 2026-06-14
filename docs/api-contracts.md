# API Contracts - MCP Tool Specifications

This document defines the tool schemas exposed by all 5 Model Context Protocol (MCP) servers in the CampusPulse network. Every tool response returns JSON structured objects including a `"source"` string metadata field for citation attribution.

---

## 1. Library MCP Server (`port: 5001`)

### `search_books`
Search library inventory by title, author, or subject keyword.
- **Input Schema**:
  ```json
  {
    "query": { "type": "string", "description": "Search keyword for title, author, or genre" }
  }
  ```
- **Returns**: `Array` of books with IDs, locations, status, and due dates if borrowed.

### `get_book_availability`
Check copies remaining and location for a specific book.
- **Input Schema**:
  ```json
  {
    "book_id": { "type": "string", "description": "Unique book identifier (e.g. ISBN or custom ID)" }
  }
  ```
- **Returns**: Book details and quantity remaining.

### `get_library_hours`
Retrieve library opening and closing times.
- **Input Schema**: `{}`
- **Returns**: Timings for weekdays and weekends.

### `reserve_book`
Reserve a copy of a book for a student.
- **Input Schema**:
  ```json
  {
    "book_id": { "type": "string" },
    "student_id": { "type": "string" }
  }
  ```
- **Returns**: Reservation confirmation status.

### `get_borrowed_books`
List books currently checked out by a specific student.
- **Input Schema**:
  ```json
  {
    "student_id": { "type": "string" }
  }
  ```
- **Returns**: List of borrowed books and their due dates.

---

## 2. Cafeteria MCP Server (`port: 5002`)

### `get_today_menu`
Fetch meal options for breakfast, lunch, snacks, and dinner.
- **Input Schema**: `{}`
- **Returns**: Timings, food items, vegetarian/non-vegetarian tags.

### `get_weekly_menu`
Fetch full 7-day menu.
- **Input Schema**: `{}`
- **Returns**: Complete weekly grid.

### `get_menu_by_day`
Fetch menu items for a specific day.
- **Input Schema**:
  ```json
  {
    "day": { "type": "string", "description": "Day of the week (e.g. Monday, Tuesday)" }
  }
  ```
- **Returns**: Meals list for the specified day.

### `get_special_offers`
Get dynamic daily cafeteria deals or specials.
- **Input Schema**: `{}`
- **Returns**: Details of promotional items.

### `get_item_nutrition`
Look up calories, macronutrients, and allergens.
- **Input Schema**:
  ```json
  {
    "item_name": { "type": "string" }
  }
  ```
- **Returns**: Nutrient structure and allergy warnings.

### `get_mess_timings`
Retrieve cafeteria operating schedules.
- **Input Schema**: `{}`
- **Returns**: Table of hours for each meal.

---

## 3. Events MCP Server (`port: 5003`)

### `get_upcoming_events`
List events in a coming timeframe.
- **Input Schema**:
  ```json
  {
    "days_ahead": { "type": "number", "description": "Range of days to filter (default: 7)" }
  }
  ```
- **Returns**: Scheduled events.

### `search_events`
Search names and descriptions of upcoming gatherings.
- **Input Schema**:
  ```json
  {
    "query": { "type": "string" }
  }
  ```
- **Returns**: Filtered list of events.

### `get_event_details`
Get venue, organization details, and capacity.
- **Input Schema**:
  ```json
  {
    "event_id": { "type": "string" }
  }
  ```
- **Returns**: Detailed event layout.

### `get_events_by_club`
Filter upcoming events hosted by a specific college club.
- **Input Schema**:
  ```json
  {
    "club_name": { "type": "string" }
  }
  ```
- **Returns**: Array of events for the club.

### `get_events_by_date`
Filter events happening on a specific date.
- **Input Schema**:
  ```json
  {
    "date": { "type": "string", "description": "YYYY-MM-DD date format" }
  }
  ```
- **Returns**: List of events on that date.

---

## 4. Academics MCP Server (`port: 5004`)

### `search_handbook`
Keyword search student policies and guidelines.
- **Input Schema**:
  ```json
  {
    "query": { "type": "string" }
  }
  ```
- **Returns**: Text snippets from policies and regulation page links.

### `get_academic_calendar`
Exposes semesters, holidays, and exam timelines.
- **Input Schema**: `{}`
- **Returns**: Array of dates and events.

### `get_exam_schedule`
Fetch exam dates by course identifier.
- **Input Schema**:
  ```json
  {
    "course_code": { "type": "string", "description": "Optional course filter (e.g. CS101)" }
  }
  ```
- **Returns**: Exam schedule list.

### `get_course_info`
Fetch credentials, pre-requisites, syllabus, and instructor details.
- **Input Schema**:
  ```json
  {
    "course_code": { "type": "string" }
  }
  ```
- **Returns**: Course syllabus summary.

### `get_department_contact`
Look up administrative office numbers and emails.
- **Input Schema**:
  ```json
  {
    "department": { "type": "string" }
  }
  ```
- **Returns**: Office phone and contact details.

---

## 5. Notices & Transport MCP Server (`port: 5005`)

### `get_latest_notices`
Expose news items, notices, and critical announcements.
- **Input Schema**:
  ```json
  {
    "category": { "type": "string", "description": "Optional notice category (e.g., exams, fees)" }
  }
  ```
- **Returns**: List of recent announcements.

### `get_shuttle_schedule`
Expose college shuttle schedules and routes.
- **Input Schema**:
  ```json
  {
    "route": { "type": "string", "description": "Optional route string filter" }
  }
  ```
- **Returns**: Shuttle times.

### `get_building_directions`
Quick details of campus building locations.
- **Input Schema**:
  ```json
  {
    "building_name": { "type": "string" }
  }
  ```
- **Returns**: Plain text navigation details.
