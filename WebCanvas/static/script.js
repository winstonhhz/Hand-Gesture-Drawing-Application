// ============================================================
// CONNECT TO PYTHON
// ============================================================

// Connect this webpage to the Flask-SocketIO server.
const socket = io();


// ============================================================
// CANVAS
// ============================================================

let wasDrawing = false;
let previousGesture = "idle";

// Permanent drawing canvas.
const drawingCanvas = document.getElementById("drawingCanvas");
const drawingCtx = drawingCanvas.getContext("2d");

// Temporary cursor canvas.
const cursorCanvas = document.getElementById("cursorCanvas");
const cursorCtx = cursorCanvas.getContext("2d");

// ============================================================
// FINGER CURSOR
// ============================================================

// Store the current fingertip position.
let currentX = null;
let currentY = null;

// Current brush settings.
// These will eventually come from the Paint toolbar.
let brushColor = "red";
let brushSize = 3;
let currentTool = "pen";


// ============================================================
// SOCKETIO CONNECTION
// ============================================================

// Check whether the browser successfully connects
// to the Python SocketIO server.
socket.on("connect", function() {

    console.log("Connected to Python SocketIO server!");

});


// ============================================================
// PREVIOUS FINGER POSITION
// ============================================================

// We need to remember where the finger was in the
// previous frame so that we can connect the points.
let previousX = null;
let previousY = null;


// ============================================================
// Draw a continuous line between two fingertip positions.
// Adds intermediate points when the distance is large.
// ============================================================
function drawInterpolatedLine(x1, y1, x2, y2) {

    const distance = Math.hypot(x2 - x1, y2 - y1);

    // Maximum spacing between interpolated points, in pixels.
    const spacing = 3;

    const steps = Math.max(1, Math.ceil(distance / spacing));

    drawingCtx.beginPath();
    drawingCtx.moveTo(x1, y1);

    for (let i = 1; i <= steps; i++) {

        const progress = i / steps;

        const interpolatedX = x1 + (x2 - x1) * progress;
        const interpolatedY = y1 + (y2 - y1) * progress;

        drawingCtx.lineTo(interpolatedX, interpolatedY);
    }

    if (currentTool === "eraser") {
        drawingCtx.strokeStyle = "black";
    } else {
        drawingCtx.strokeStyle = brushColor;
    }

    drawingCtx.lineWidth = brushSize;
    drawingCtx.lineCap = "round";
    drawingCtx.lineJoin = "round";
    drawingCtx.stroke();
}

// ============================================================
// RECEIVE HAND POSITION
// ============================================================

// Python sends this event whenever a hand is detected.
socket.on("hand_position", function(position) {

    const x = position.x;
    const y = position.y;
    const gesture = position.gesture;
    // console.log(gesture);

    // ========================================================
    // SAVE HISTORY WHEN AN ACTION FINISHES
    // ========================================================
    if (
        (previousGesture === "draw" || previousGesture === "erase") &&
        previousGesture !== gesture
    ) {
        saveCanvasState();
        wasDrawing = false;
    }

    previousGesture = gesture;

    // ========================================================
    // DRAW
    // ========================================================

    if (gesture === "draw") {

        if (!wasDrawing) {
            wasDrawing = true;
        }


        if (previousX !== null && previousY !== null) {

            drawInterpolatedLine(previousX, previousY, x, y);

        }

        previousX = x;
        previousY = y;

    }

    else if (gesture === "erase") {

        // Stop the previous drawing line.
        previousX = null;
        previousY = null;

        drawingCtx.beginPath();

        drawingCtx.arc(
            x,
            y,
            20,
            0,
            Math.PI * 2
        );

        drawingCtx.fillStyle = "black";
        drawingCtx.fill();
    }


    else if (gesture === "pause") {

        // Stop the previous drawing line.
        previousX = null;
        previousY = null;
    }


    else {

        // Any other gesture also breaks the drawing connection.
        previousX = null;
        previousY = null;
        previousGesture = gesture;
    }

    // ========================================================
    // FINGERTIP CURSOR
    // ========================================================

    cursorCtx.clearRect(
        0,
        0,
        cursorCanvas.width,
        cursorCanvas.height
    );

    cursorCtx.beginPath();

    cursorCtx.arc(
        x,
        y,
        brushSize / 2 + 5,
        0,
        Math.PI * 2
    );

    cursorCtx.strokeStyle = brushColor;
    cursorCtx.lineWidth = 2;

    cursorCtx.stroke();

});

// ============================================================
// TOOLBAR
// ============================================================

// Pen button
const penButton = document.getElementById("penButton");
// Eraser button
const eraserButton = document.getElementById("eraserButton");

// Clear button
const clearButton = document.getElementById("clearButton");

// Undo and Redo Button
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");

// UNDO BUTTON
undoButton.addEventListener("click", function() {
    undo();
});

// REDO BUTTON
redoButton.addEventListener("click", function() {
    redo();
});

// Brush size slider
const brushSizeSlider = document.getElementById("brushSize");

// ============================================================
// PEN
// ============================================================

penButton.addEventListener("click", function() {

    currentTool = "pen";

    penButton.classList.add("active");
    eraserButton.classList.remove("active");

});


// ============================================================
// ERASER
// ============================================================

eraserButton.addEventListener("click", function() {

    currentTool = "eraser";

    eraserButton.classList.add("active");
    penButton.classList.remove("active");

});


// ============================================================
// CLEAR
// ============================================================

clearButton.addEventListener("click", function() {

    drawingCtx.clearRect(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );

});


// ============================================================
// COLORS
// ============================================================

const colorButtons = document.querySelectorAll(".color-button");

colorButtons.forEach(function(button) {

    button.addEventListener("click", function() {

        brushColor = button.dataset.color;

        // Selecting a color automatically switches back to Pen.
        currentTool = "pen";

        penButton.classList.add("active");
        eraserButton.classList.remove("active");

    });

});

// ============================================================
// BRUSH SIZE
// ============================================================

brushSizeSlider.addEventListener("input", function() {

    brushSize = Number(brushSizeSlider.value);

});

// ============================================================
 // UNDO / REDO HISTORY
 // ============================================================

// Store completed canvas states.
let undoStack = [];
let redoStack = [];

const MAX_HISTORY = 20;

// Get a snapshot of the current drawing.
function getCanvasState() {
    return drawingCtx.getImageData(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );
}

// Restore a saved canvas state.
function restoreCanvasState(state) {
    drawingCtx.putImageData(state, 0, 0);
}

// Save a completed action.
function saveCanvasState() {
    const currentState = getCanvasState();

    undoStack.push(currentState);

    // Keep the history within the limit.
    if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
    }

    // A new action invalidates the redo history.
    redoStack = [];
}

// Start with the blank canvas as the first state.
undoStack.push(getCanvasState());

// UNDO
function undo() {
    // Keep at least one state in history.
    if (undoStack.length <= 1) {
        return;
    }

    // Move the current state to the redo history.
    const currentState = undoStack.pop();
    redoStack.push(currentState);

    // Restore the previous state.
    restoreCanvasState(undoStack[undoStack.length - 1]);

    // Break any ongoing drawing line.
    previousX = null;
    previousY = null;
    wasDrawing = false;
    previousGesture = "idle";
}

// REDO
function redo() {
    if (redoStack.length === 0) {
        return;
    }

    // Restore the most recently undone state.
    const nextState = redoStack.pop();

    undoStack.push(nextState);
    restoreCanvasState(nextState);

    // Break any ongoing drawing line.
    previousX = null;
    previousY = null;
    wasDrawing = false;
    previousGesture = "idle";
}

