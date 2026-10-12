# Virtual Paint — Hand Gesture Drawing Application

## 1. Project Overview

Virtual Paint is a web-based drawing application that allows users to draw on a digital canvas using hand gestures detected through a webcam.

The project uses computer vision and hand tracking to detect the user's index finger position and gestures. The detected information is sent from a Python server to a web browser, where the drawing is displayed on an HTML canvas.

The goal of this project is to provide a touch-free drawing experience without requiring a physical mouse or drawing tablet.

## 2. Features

### Implemented
- **Hand Tracking:** Detects the user's hand and index finger using MediaPipe.
- **Gesture Recognition:** Recognizes gestures for drawing, pausing, and erasing.
- **Virtual Drawing:** Draws on a digital canvas using the index finger.
- **Pen Tool:** Allows users to draw on the canvas.
- **Eraser Tool:** Allows users to erase parts of their drawing.
- **Color Selection:** Supports multiple drawing colors.
- **Brush Size Adjustment:** Allows users to change the brush size.
- **Clear Canvas:** Clears the entire drawing canvas.
- **Web Interface:** Provides a browser-based interface for the drawing application.

### Planned
- Undo and redo functionality.
- Improved drawing stabilization.
- Performance optimization.
- Additional drawing tools and interface improvements.

*Update these lists as features are completed.*

## 3. Technologies Used

| Technology | Purpose |
|---|---|
| Python | Main programming language for hand tracking |
| MediaPipe | Hand landmark detection and tracking |
| OpenCV | Webcam access and image processing |
| Flask | Serves the web application |
| Flask-SocketIO | Sends hand-tracking data from Python to the browser |
| JavaScript | Handles drawing logic and toolbar interactions |
| HTML | Defines the web page structure |
| CSS | Styles the user interface |
| HTML Canvas | Displays and stores the drawing |

## 4. Project Structure

```text
WebCanvas/
├── server.py
├── templates/
│   └── index.html
├── static/
│   └── script.js
README.md
```

- `server.py`: Accesses the webcam, processes frames, detects hand landmarks, identifies gestures, and sends hand data to the browser.
- `templates/index.html`: Defines the web interface, toolbar, and drawing canvases.
- `static/script.js`: Receives hand data and handles drawing, erasing, colors, brush size, and canvas interactions.
- `README.md`: Documents the project and explains how to set it up.

## 5. How It Works

The application follows this process:

1. Open the webcam using OpenCV.
2. Use MediaPipe to detect the user's hand and landmarks.
3. Identify the index finger position and the current hand gesture.
4. Send the position and gesture to the browser using Flask-SocketIO.
5. Receive the data in JavaScript.
6. Update the HTML canvas according to the detected gesture.

## 6. Installation

### Prerequisites

- Python 3.12
- A working webcam
- A modern web browser
- pip, Python's package installer

### Install Dependencies

Open a terminal in the project directory and install the required packages:

```bash
pip install flask flask-socketio opencv-contrib-python mediapipe
```

If you use a Python virtual environment, activate it before installing the packages.

## 7. Running the Application

1. Connect your webcam.
2. Open a terminal in the project directory.
3. Activate your virtual environment if you have one.
4. Run the server:

```bash
python server.py
```

5. Open your browser and visit:

```text
http://127.0.0.1:5000
```

6. Allow the application to use the webcam if prompted, then start interacting with the canvas using the supported hand gestures.

## 8. Current Limitations

- Hand tracking may become less stable under poor lighting or when the hand is partially obscured.
- Drawing smoothness depends on tracking stability and system performance.
- The current gesture set supports only a limited number of drawing interactions.
- Additional features and performance improvements are still under development.

## 9. Future Improvements

- Complete undo and redo functionality.
- Improve hand-position stabilization to reduce jitter.
- Add more colors and drawing tools.
- Improve the user interface.
- Optimize performance when the browser and webcam processing run simultaneously.

## 10. Author

Developed as a personal programming project to explore computer vision, hand tracking, and web application development.
