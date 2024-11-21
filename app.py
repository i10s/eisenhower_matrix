from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_socketio import SocketIO, emit, join_room
import sqlite3
import uuid
from dotenv import load_dotenv
import os
import openai
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


app = Flask(__name__)
socketio = SocketIO(app)

# Initialize OpenAI API

# Initialize database
def init_db():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            quadrant TEXT NOT NULL,
            text TEXT NOT NULL,
            color TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Helper functions to interact with the database
def save_task(session_id, quadrant, text, color):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tasks (session_id, quadrant, text, color)
        VALUES (?, ?, ?, ?)
    """, (session_id, quadrant, text, color))
    conn.commit()
    conn.close()

def load_tasks(session_id):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT quadrant, text, color FROM tasks
        WHERE session_id = ?
    """, (session_id,))
    tasks = cursor.fetchall()
    conn.close()
    return tasks

def delete_task(session_id, text):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM tasks
        WHERE session_id = ? AND text = ?
    """, (session_id, text))
    conn.commit()
    conn.close()

def update_task_quadrant(session_id, text, new_quadrant):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE tasks
        SET quadrant = ?
        WHERE session_id = ? AND text = ?
    """, (new_quadrant, session_id, text))
    conn.commit()
    conn.close()

# Routes
@app.route("/")
def index():
    """Redirect to a new session or an existing one."""
    return redirect(url_for("new_session"))

@app.route("/session/<session_id>")
def load_session(session_id):
    """Load an existing session based on the session ID."""
    return render_template("index.html", session_code=session_id)

@app.route("/new-session")
def new_session():
    """Create a new session and redirect to its URL."""
    session_id = str(uuid.uuid4())
    return redirect(url_for("load_session", session_id=session_id))

@app.route("/join", methods=["POST"])
def join():
    """Handle session code submission and redirect to the appropriate session."""
    session_id = request.form.get("session_id", "").strip()
    if not session_id:
        return "Session ID is required", 400

    return redirect(url_for("load_session", session_id=session_id))

@app.route("/suggest_task", methods=["POST"])
def suggest_task():
    """
    Generate task suggestions based on the user's input using OpenAI API.
    """
    user_input = request.json.get("input_text", "").strip()
    if not user_input:
        return jsonify({"error": "Input text is required"}), 400

    messages = [
        {
            "role": "system",
            "content": (
                "You are an assistant that helps users brainstorm task ideas. "
                "Your job is to suggest relevant and actionable tasks based on user input."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Suggest tasks related to the following topic:\n\n{user_input}\n\n"
                "Provide 3 task suggestions, clearly separated, and ensure they are actionable."
            ),
        },
    ]

    try:
        # Call the OpenAI API with messages
        response = client.chat.completions.create(model="gpt-4",
        messages=messages,
        max_tokens=150,  # Adjust based on response length requirements
        temperature=0.7)
        # Extract the suggestions from the response
        suggestions = response.choices[0].message.content.strip()
        return jsonify({"suggestions": suggestions.split("\n")})
    except openai.AuthenticationError:
        return jsonify({"error": "Invalid OpenAI API key or not configured. Please check your settings."}), 401
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


# WebSocket Events
@socketio.on("update_task")
def handle_update_task(data):
    """Handle task updates (add, delete, move) and broadcast changes."""
    session_id = data.get("session_id")
    if not session_id:
        emit("error", {"message": "No session ID provided."}, to=request.sid)
        return

    action = data.get("action")
    task_data = data.get("taskData")
    quadrant = task_data.get("quadrant")
    text = task_data.get("text")
    color = task_data.get("color")

    if action == "add":
        save_task(session_id, quadrant, text, color)
    elif action == "delete":
        delete_task(session_id, text)
    elif action == "move":
        update_task_quadrant(session_id, text, quadrant)

    # Broadcast the task update to all clients in the session
    emit("task_updated", data, room=session_id, include_self=False)

@socketio.on("join_session")
def join_session(data):
    """Allow a client to join a session and load existing tasks."""
    session_id = data.get("session_id")
    if not session_id:
        emit("error", {"message": "No session ID provided."}, to=request.sid)
        return

    # Join the client to the session room
    join_room(session_id)

    # Load tasks and send them to the client
    tasks = load_tasks(session_id)
    task_list = [{"quadrant": t[0], "text": t[1], "color": t[2]} for t in tasks] if tasks else []
    emit("load_matrix", task_list, to=request.sid)


if __name__ == "__main__":
    socketio.run(app, debug=True)
