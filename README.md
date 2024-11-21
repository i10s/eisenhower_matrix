
# Eisenhower Matrix with AI Integration

This project is an AI-powered Eisenhower Matrix application that helps users manage tasks efficiently. The app now includes an **AI-based task suggestion feature** using OpenAI's GPT-4 model, as well as enhanced session handling and a streamlined UI.

## Features

1. **Task Management**
   - Create, update, and delete tasks in a quadrant-based Eisenhower Matrix.
   - Drag-and-drop functionality to move tasks between quadrants.

2. **AI-Powered Task Suggestions**
   - Enter a topic, and the AI will suggest actionable tasks related to it.
   - Suggestions can be added directly to the task list.

3. **Session-Based Collaboration**
   - Share a unique session code to collaborate with others in real-time.
   - Enhanced session handling for better reliability.

4. **Customizable Quadrants**
   - Editable quadrant titles.
   - Color-coded quadrants for better visualization.

5. **Dark Mode**
   - Toggle dark mode for improved user experience.

6. **Cross-Platform Compatibility**
   - Fully responsive UI for desktop and mobile devices.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/i10s/eisenhower_matrix.git
   cd eisenhower_matrix
   ```

2. Set up a Python virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows, use venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   poetry install
   ```

4. Set up environment variables in a `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   FLASK_ENV=development
   ```

5. Run the application:
   ```bash
   flask run
   ```

## Usage

1. Access the app at `http://127.0.0.1:5000`.
2. Create a new session or join an existing one using a session code.
3. Use the AI task suggestion feature by entering a topic and clicking the **"Suggest Task"** button.
4. Manage tasks in the Eisenhower Matrix using drag-and-drop.

## Deployment

The app is configured for deployment using Docker and Fly.io. Use the included `fly.toml` for deployment configuration.

1. Build and run the Docker image locally:
   ```bash
   docker build -t eisenhower_matrix .
   docker run -p 5000:5000 eisenhower_matrix
   ```

2. Deploy to Fly.io:
   ```bash
   fly deploy
   ```

## Technologies Used

- **Frontend:**
  - HTML5, CSS3, JavaScript
  - Bootstrap 5
  - Pickr for color picker

- **Backend:**
  - Flask
  - Flask-SocketIO for real-time collaboration
  - SQLite for data storage

- **AI Integration:**
  - OpenAI GPT-4 model for task suggestions

## Contributing

1. Fork the repository.
2. Create a new feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes and push the branch:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a pull request.

## License

This project is licensed under the MIT License.

---

### Acknowledgements

Special thanks to the contributors and the OpenAI team for their amazing APIs.
