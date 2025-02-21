from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import time

app = Flask(__name__)
CORS(app)

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
mp_drawing = mp.solutions.drawing_utils

cap = None
squat_count = 0
squat_position = "up"
last_squat_time = 0  # Cooldown timer

def calculate_angle(a, b, c):
    """Calculate angle between three points."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    return 360 - angle if angle > 180 else angle

@app.route("/start", methods=["GET"])
def start_camera():
    global cap, squat_count, squat_position, last_squat_time
    squat_count = 0  
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return jsonify({"error": "Could not access webcam"}), 500

    def generate_frames():
        global squat_count, squat_position, last_squat_time
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb_frame)

            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark
                try:
                    hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, 
                           landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
                    knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, 
                            landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
                    ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, 
                             landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]

                    angle = calculate_angle(hip, knee, ankle)

                    # Improve squat detection logic
                    current_time = time.time()
                    if angle < 100 and squat_position == "up":  # Adjusted threshold
                        squat_position = "down"
                    elif angle > 160 and squat_position == "down":
                        if current_time - last_squat_time > 0.7:  # Increased cooldown
                            squat_position = "up"
                            squat_count += 1
                            last_squat_time = current_time
                            print(f"Squat Count: {squat_count}")  # Debugging output

                    print(f"Angle: {angle:.2f}, Position: {squat_position}, Count: {squat_count}")  # Debugging

                    mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
                except Exception as e:
                    print(f"Error detecting squat: {e}")  # Handle errors

            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/stop", methods=["GET"])
def stop_camera():
    global cap
    if cap is not None:
        cap.release()
        cv2.destroyAllWindows()
    return jsonify({"message": "Camera stopped"}), 200

@app.route("/count", methods=["GET"])
def get_squat_count():
    return jsonify({"squat_count": squat_count})

if __name__ == "__main__":
    app.run(debug=True, port=5002)
