# A basic WebSocket Server

# Flask is used to create our web server
from flask import Flask, render_template

# SocketIO allows Python to communicate with JavaScript in real time
from flask_socketio import SocketIO

# OpenCV is used to access the webcam
import cv2

# MediaPipe is used to detect the hand
import mediapipe as mp

# For diagnosis the low fps issue
import time


# ============================================================
# INITIALIZE FLASK
# ============================================================

app = Flask(__name__)

# Create the SocketIO connection
socketio = SocketIO(app)


# ============================================================
# INITIALIZE MEDIAPIPE
# ============================================================

# Get MediaPipe's hand tracking solution
mp_hands = mp.solutions.hands

# Create the hand detector
hands = mp_hands.Hands(
    max_num_hands=1,

    # Minimum confidence required to detect a hand
    min_detection_confidence=0.7,

    # Minimum confidence required to continue tracking a hand
    min_tracking_confidence=0.7
)


# ============================================================
# INITIALIZE CAMERA
# ============================================================

# Open the default webcam
# CAP_DSHOW helps with webcam compatibility on Windows
camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)

# ============================================================
# STABILIZER SETTINGS
# ============================================================

# Controls how much the fingertip movement is smoothed.
# Lower value = smoother but more lag.
# Higher value = more responsive but less stable.
SMOOTHING = 1

# ============================================================
# GESTURE STABILITY
# ============================================================
GESTURE_CONFIRM_FRAMES = 4

candidate_gesture = None
candidate_count = 0
current_gesture = "idle"



# ============================================================
# WEBPAGE
# ============================================================

# When the browser visits "/",
# Flask sends index.html to the browser
@app.route("/")
def home():
    return render_template("index.html")


# ============================================================
# GET INDEX FINGER POSITION
# ============================================================

def get_index_position(hand, frame_width, frame_height):

    # MediaPipe landmark 8 = index fingertip
    index_tip = hand.landmark[8]

    # MediaPipe gives coordinates between 0 and 1.
    # Convert them into actual camera pixel coordinates.
    index_x = int(index_tip.x * frame_width)
    index_y = int(index_tip.y * frame_height)

    return index_x, index_y

# ============================================================
# DETECT FINGERS
# ============================================================
def get_finger_status(hand):
    """
    Determine which fingers are currently raised.

    Returns True if the finger is raised,
    otherwise False.
    """

    index_up = (
        hand.landmark[8].y <
        hand.landmark[6].y
    )

    middle_up = (
        hand.landmark[12].y <
        hand.landmark[10].y
    )

    ring_up = (
        hand.landmark[16].y <
        hand.landmark[14].y
    )

    pinky_up = (
        hand.landmark[20].y <
        hand.landmark[18].y
    )

    return {
        "index": index_up,
        "middle": middle_up,
        "ring": ring_up,
        "pinky": pinky_up
    }

# ============================================================
# DETECT GESTURE
# ============================================================

def detect_gesture(fingers):
    """
    Determine the current canvas gesture.
    """

    index = fingers["index"]
    middle = fingers["middle"]
    ring = fingers["ring"]
    pinky = fingers["pinky"]

    # Index only → draw
    if index and not middle and not ring and not pinky:
        return "draw"

    # Index + middle → pause
    elif index and middle and not ring and not pinky:
        return "pause"

    # Index + pinky → erase
    elif index and not middle and not ring and pinky:
        return "erase"

    # Anything else → idle
    else:
        return "idle"

# ============================================================
# STABLE GESTURE
# ============================================================

def stabilize_gesture(detected_gesture):
    global candidate_gesture
    global candidate_count
    global current_gesture

    # Is this the same gesture as the previous frame?
    if detected_gesture == candidate_gesture:
        candidate_count += 1
    else:
        candidate_gesture = detected_gesture
        candidate_count = 1

    # Switch only after consistent detection.
    if candidate_count >= GESTURE_CONFIRM_FRAMES:
        current_gesture = candidate_gesture

    return current_gesture

# ============================================================
# SMOOTH INDEX FINGER POSITION
# ============================================================

def smooth_position(
    index_x,
    index_y,
    previous_x,
    previous_y
):
    # If this is the first detected position,
    # there is nothing to smooth yet.
    if previous_x is None or previous_y is None:
        return index_x, index_y

    # Calculate the new X position.
    smooth_x = (
        SMOOTHING * index_x
        + (1 - SMOOTHING) * previous_x
    )

    # Calculate the new Y position.
    smooth_y = (
        SMOOTHING * index_y
        + (1 - SMOOTHING) * previous_y
    )

    return int(smooth_x), int(smooth_y)


# ============================================================
# CAMERA LOOP
# ============================================================

def camera_loop():

    # Store the previous stabilized fingertip position
    previous_x = None
    previous_y = None

    # Test
    frame_count = 0
    start_time = time.time()

    # Keep reading the webcam continuously
    while True:

        # Capture one frame from the camera
        success, frame = camera.read()

        # If the camera failed to provide a frame,
        # try again
        if not success:
            continue

        # Test
        frame_count += 1

        elapsed = time.time() - start_time

        if elapsed >= 1:
            fps = frame_count / elapsed

            print("Python FPS:", round(fps, 1))

            frame_count = 0
            start_time = time.time()

        # Flip the camera horizontally.
        # This makes movement feel more natural,
        # like looking into a mirror.
        frame = cv2.flip(frame, 1)

        # Get the frame dimensions
        height, width, _ = frame.shape

        # MediaPipe expects RGB images.
        # OpenCV normally gives us BGR images.
        rgb = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )

        # Send the frame to MediaPipe
        results = hands.process(rgb)


        # ====================================================
        # CHECK IF A HAND WAS DETECTED
        # ====================================================

        if results.multi_hand_landmarks:

            # print("Hand detected")

            # Get the first detected hand
            hand = results.multi_hand_landmarks[0]

            # Get the current finger states.
            fingers = get_finger_status(hand)

            # Determine the current gesture.
            detected_gesture = detect_gesture(fingers)
            gesture = stabilize_gesture(detected_gesture)

            # Get the raw MediaPipe fingertip position
            index_x, index_y = get_index_position(
                hand,
                width,
                height
            )

            # Smooth the raw position to reduce shaking
            index_x, index_y = smooth_position(
                index_x,
                index_y,
                previous_x,
                previous_y
            )

            # Save the current position for the next frame
            previous_x = index_x
            previous_y = index_y

            # Send the stabilized position to JavaScript

            socketio.emit(
                "hand_position",
                {
                    "x": index_x,
                    "y": index_y,
                    "gesture": gesture
                }
            )

            # print("Sent:", index_x, index_y)

        # Give SocketIO a small amount of time
        # to handle network communication.
        socketio.sleep(0.01)


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    # Start the camera loop in the background.
    #
    # This allows the Flask web server and
    # camera processing to run at the same time.
    socketio.start_background_task(
        camera_loop
    )

    # Start the Flask web server

    # When debug=True, With Flask-SocketIO, the Flask debug reloader can restart the process,
    # which can interfere with the background camera task and SocketIO connection while we're testing

    # Debug mode is disabled to prevent the development reloader from restarting
    # our camera/SocketIO process.
    socketio.run(
        app,
        debug=False
    )




