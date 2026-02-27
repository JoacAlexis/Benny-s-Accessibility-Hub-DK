from picamera2 import Picamera2
import cv2
import mediapipe as mp
import numpy as np

# MediaPipe setup
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True
)

# Eye and iris indices
LEFT_IRIS = [474, 475, 476, 477]
RIGHT_IRIS = [469, 470, 471, 472]

# Camera setup
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

            # --- LEFT IRIS ---
            left_iris_points = []
            for idx in LEFT_IRIS:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                left_iris_points.append((x, y))

            left_center = np.mean(left_iris_points, axis=0).astype(int)

            # draw iris center dot
            cv2.circle(frame, tuple(left_center), 3, (0, 0, 255), -1)

            # draw eye circle (bounding circle around eye landmarks)
            left_eye_points = []
            for connection in mp_face_mesh.FACEMESH_LEFT_EYE:
                for idx in connection:
                    x = int(face_landmarks.landmark[idx].x * w)
                    y = int(face_landmarks.landmark[idx].y * h)
                    left_eye_points.append((x, y))

            left_eye_points = np.array(left_eye_points)
            (x, y), radius = cv2.minEnclosingCircle(left_eye_points)
            cv2.circle(frame, (int(x), int(y)), int(radius), (255, 0, 0), 2)

            # --- RIGHT IRIS ---
            right_iris_points = []
            for idx in RIGHT_IRIS:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                right_iris_points.append((x, y))

            right_center = np.mean(right_iris_points, axis=0).astype(int)

            cv2.circle(frame, tuple(right_center), 3, (0, 0, 255), -1)

            # draw right eye circle
            right_eye_points = []
            for connection in mp_face_mesh.FACEMESH_RIGHT_EYE:
                for idx in connection:
                    x = int(face_landmarks.landmark[idx].x * w)
                    y = int(face_landmarks.landmark[idx].y * h)
                    right_eye_points.append((x, y))

            right_eye_points = np.array(right_eye_points)
            (x, y), radius = cv2.minEnclosingCircle(right_eye_points)
            cv2.circle(frame, (int(x), int(y)), int(radius), (255, 0, 0), 2)

    cv2.imshow("Eye Tracking", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cv2.destroyAllWindows()
picam2.stop()
