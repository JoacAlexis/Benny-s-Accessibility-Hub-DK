from picamera2 import Picamera2
import cv2
import mediapipe as mp
import numpy as np

# =========================
# USER SETTINGS
# =========================
UPPER_RATIO = 0.4   # move up line (0.0 - 1.0)
LOWER_RATIO = 0.5   # move down line (0.0 - 1.0)

# =========================
# MediaPipe Setup
# =========================
mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True
)

LEFT_IRIS = [474, 475, 476, 477]
RIGHT_IRIS = [469, 470, 471, 472]

# =========================
# Camera Setup
# =========================
picam2 = Picamera2()
picam2.configure(
    picam2.create_preview_configuration(
        main={"size": (640, 480), "format": "BGR888"}
    )
)
picam2.start()

while True:
    frame = picam2.capture_array()
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:

            h, w, _ = frame.shape

            for eye_connections, iris_indices in [
                (mp_face_mesh.FACEMESH_LEFT_EYE, LEFT_IRIS),
                (mp_face_mesh.FACEMESH_RIGHT_EYE, RIGHT_IRIS),
            ]:

                # -------- Get Eye Points --------
                eye_points = []
                for connection in eye_connections:
                    for idx in connection:
                        x = int(face_landmarks.landmark[idx].x * w)
                        y = int(face_landmarks.landmark[idx].y * h)
                        eye_points.append((x, y))

                eye_points = np.array(eye_points)

                # Bounding circle around eye
                (cx, cy), radius = cv2.minEnclosingCircle(eye_points)
                cx, cy, radius = int(cx), int(cy), int(radius)

                cv2.circle(frame, (cx, cy), radius, (255, 0, 0), 2)

                # -------- Threshold Lines --------
                top_y = cy - radius
                bottom_y = cy + radius

                upper_line_y = int(top_y + (2 * radius) * UPPER_RATIO)
                lower_line_y = int(top_y + (2 * radius) * LOWER_RATIO)

                # draw lines across the eye circle
                cv2.line(frame,
                         (cx - radius, upper_line_y),
                         (cx + radius, upper_line_y),
                         (0, 255, 255), 2)

                cv2.line(frame,
                         (cx - radius, lower_line_y),
                         (cx + radius, lower_line_y),
                         (0, 255, 255), 2)

                # -------- Iris Center --------
                iris_points = []
                for idx in iris_indices:
                    x = int(face_landmarks.landmark[idx].x * w)
                    y = int(face_landmarks.landmark[idx].y * h)
                    iris_points.append((x, y))

                iris_center = np.mean(iris_points, axis=0).astype(int)
                ix, iy = iris_center

                cv2.circle(frame, (ix, iy), 3, (0, 0, 255), -1)

                # -------- Detection --------
                if iy < upper_line_y:
                    text = "UP"
                elif iy > lower_line_y:
                    text = "DOWN"
                else:
                    text = "CENTER"

                cv2.putText(frame, text,
                            (cx - radius, cy - radius - 10),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6, (0, 255, 0), 2)

    cv2.imshow("Eye Direction", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cv2.destroyAllWindows()
picam2.stop()
