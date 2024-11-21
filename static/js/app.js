document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("taskInput");
    const quadrantSelect = document.getElementById("quadrantSelect");
    const addTaskButton = document.getElementById("addTaskButton");
    const suggestTaskButton = document.getElementById("suggestTaskButton"); // New button for task suggestions
    const downloadScreenshotButton = document.getElementById("downloadScreenshotButton");
    const sessionCode = document.getElementById("sessionCode").textContent.trim();
    const darkModeToggle = document.getElementById("darkModeToggle");1
    const joinSessionForm = document.getElementById("joinSessionForm");
    const sessionInput = document.getElementById("sessionInput");
    let selectedColor = "#ffffff"; // Default color
    let draggedItem = null;

    // Initialize WebSocket connection
    const socket = io.connect(location.origin);

    // Join the session room and load tasks
    socket.emit("join_session", { session_id: sessionCode });

    // Handle errors from the server
    socket.on("error", (data) => {
        alert(data.message || "An error occurred while joining the session.");
    });

    joinSessionForm.addEventListener("submit", (e) => {
        e.preventDefault(); // Prevent the form's default submission

        const sessionCode = sessionInput.value.trim();
        if (!sessionCode) {
            alert("Please enter a valid session code.");
            return;
        }

        // Redirect to the session page with the entered session code
        window.location.href = `/session/${sessionCode}`;
    });

    // Load tasks from the server
    socket.on("load_matrix", (tasks) => {
        tasks.forEach((task) => {
            const taskList = document.querySelector(`.quadrant[data-quadrant="${task.quadrant}"] .task-list`);
            const taskElement = createTaskElement(task.text, task.color);
            taskList.appendChild(taskElement);
        });
    });

    // Broadcast task updates to the server
    const broadcastTaskUpdate = (action, taskData) => {
        socket.emit("update_task", { session_id: sessionCode, action, taskData });
    };

    // Handle task updates from the server
    socket.on("task_updated", (data) => {
        const { action, taskData } = data;
        const { quadrant, text, color } = taskData;

        if (action === "add") {
            const taskList = document.querySelector(`.quadrant[data-quadrant="${quadrant}"] .task-list`);
            const newTask = createTaskElement(text, color);
            taskList.appendChild(newTask);
        } else if (action === "delete") {
            document.querySelectorAll(".task").forEach((task) => {
                if (task.querySelector(".task-text").textContent.trim() === text) {
                    task.remove();
                }
            });
        } else if (action === "move") {
            const taskList = document.querySelector(`.quadrant[data-quadrant="${quadrant}"] .task-list`);
            document.querySelectorAll(".task").forEach((task) => {
                if (task.querySelector(".task-text").textContent.trim() === text) {
                    task.remove();
                    const movedTask = createTaskElement(text, color);
                    taskList.appendChild(movedTask);
                }
            });
        }
    });

    // Initialize Pickr color picker
    const pickr = Pickr.create({
        el: "#colorPicker",
        theme: "nano",
        default: selectedColor,
        swatches: ["#f28b82", "#fbbc04", "#34a853", "#4285f4", "#ffffff"],
        components: {
            preview: true,
            opacity: true,
            hue: true,
            interaction: {
                hex: true,
                rgba: true,
                input: true,
                save: true
            }
        }
    });

    pickr.on("save", (color) => {
        selectedColor = color.toHEXA().toString();
        pickr.hide();
    });

    // Create task elements
    const createTaskElement = (text, color) => {
        const task = document.createElement("li");
        task.className = "task";
        task.style.backgroundColor = color;

        const taskText = document.createElement("span");
        taskText.className = "task-text";
        taskText.textContent = text;
        task.appendChild(taskText);

        const deleteButton = document.createElement("button");
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteButton.className = "delete-button";
        deleteButton.addEventListener("click", () => {
            task.remove();
            broadcastTaskUpdate("delete", { quadrant: null, text });
        });
        task.appendChild(deleteButton);

        enableDragAndDrop(task);
        return task;
    };

    // Enable drag-and-drop functionality
    const enableDragAndDrop = (task) => {
        task.setAttribute("draggable", "true");
        task.addEventListener("dragstart", (e) => {
            draggedItem = e.target;
        });
    };

    // Handle task dropping into quadrants
    const quadrants = document.querySelectorAll(".quadrant");
    quadrants.forEach((quadrant) => {
        quadrant.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        quadrant.addEventListener("drop", (e) => {
            e.preventDefault();
            if (draggedItem) {
                const taskList = quadrant.querySelector(".task-list");
                const newQuadrant = quadrant.getAttribute("data-quadrant");
                const taskText = draggedItem.querySelector(".task-text").textContent.trim();
                const taskColor = draggedItem.style.backgroundColor;

                taskList.appendChild(draggedItem);
                draggedItem = null;

                broadcastTaskUpdate("move", { quadrant: newQuadrant, text: taskText, color: taskColor });
            }
        });
    });

    // Add new tasks
    addTaskButton.addEventListener("click", () => {
        const taskText = taskInput.value.trim();
        const selectedQuadrant = quadrantSelect.value;

        if (!taskText) {
            alert("Please enter a task.");
            return;
        }

        const newTask = createTaskElement(taskText, selectedColor);
        const targetQuadrant = document.querySelector(`.quadrant[data-quadrant="${selectedQuadrant}"] .task-list`);
        targetQuadrant.appendChild(newTask);

        taskInput.value = ""; // Clear input field
        broadcastTaskUpdate("add", { quadrant: selectedQuadrant, text: taskText, color: selectedColor });
    });

    // Handle Task Suggestions Display
    const renderSuggestions = (suggestions) => {
        const suggestionsContainer = document.getElementById("suggestionsContainer");
        suggestionsContainer.innerHTML = ""; // Clear existing suggestions

        suggestions.forEach((suggestion) => {
            const card = document.createElement("div");
            card.className = "task-suggestion-card";

            card.innerHTML = `
                <div class="card mb-3 suggestion-card" style="max-width: 600px; cursor: pointer;">
                    <div class="card-body">
                        <p class="card-text">${suggestion}</p>
                    </div>
                </div>
            `;

            // Add click event listener to populate the input field
            card.addEventListener("click", () => {
                taskInput.value = suggestion; // Set the suggestion as the input value
            });

            suggestionsContainer.appendChild(card);
        });
    };

    // Add a task from a suggestion
    const addTaskFromSuggestion = (suggestion) => {
        const selectedQuadrant = quadrantSelect.value;

        if (!selectedQuadrant) {
            alert("Please select a quadrant to add the task.");
            return;
        }

        const newTask = createTaskElement(suggestion, selectedColor);
        const targetQuadrant = document.querySelector(`.quadrant[data-quadrant="${selectedQuadrant}"] .task-list`);
        targetQuadrant.appendChild(newTask);

        // Notify server of the new task
        broadcastTaskUpdate("add", { quadrant: selectedQuadrant, text: suggestion, color: selectedColor });
    };


    // Suggest Task Button Logic
    suggestTaskButton.addEventListener("click", async () => {
        const inputText = taskInput.value.trim();
        if (!inputText) {
            alert("Please enter a topic to suggest tasks.");
            return;
        }

        try {
            const response = await fetch("/suggest_task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input_text: inputText }),
            });
            const data = await response.json();

            if (data.error) {
                alert(data.error);
            } else {
                renderSuggestions(data.suggestions);
            }
        } catch (error) {
            console.error("Error fetching task suggestions:", error);
            alert("Failed to fetch task suggestions. Please try again.");
        }
    });


    // Handle dark mode toggle
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    if (isDarkMode) {
        document.body.classList.add("dark-mode");
        darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener("change", () => {
        const enabled = darkModeToggle.checked;
        document.body.classList.toggle("dark-mode", enabled);
        localStorage.setItem("darkMode", enabled);
    });
});
