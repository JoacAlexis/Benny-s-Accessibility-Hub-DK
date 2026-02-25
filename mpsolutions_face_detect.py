from picamera2 import Picamera2
import cv2
import mediapipe as mp
import numpy as np

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    refine_landmarks=True,  # Enables iris landmarks
    max_num_faces=1
)

picam2 = Picamera2()
picam2.configure(picam2.create_preview_configuration(main={"size": (640, 480)}))
picam2.start()

LEFT_IRIS = [474, 475, 476, 477]
LEFT_EYE_TOP = 386
LEFT_EYE_BOTTOM = 374

while True:
    frame = picam2.capture_array()
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if results.multi_face_landmarks:
        mesh = results.multi_face_landmarks[0]

        h, w, _ = frame.shape

        iris_y = mesh.landmark[LEFT_IRIS[0]].y * h
        eye_top = mesh.landmark[LEFT_EYE_TOP].y * h
        eye_bottom = mesh.landmark[LEFT_EYE_BOTTOM].y * h

        ratio = (iris_y - eye_top) / (eye_bottom - eye_top)

        if ratio < 0.4:
            cv2.putText(frame, "LOOKING UP", (50,50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)
        elif ratio > 0.6:
            cv2.putText(frame, "LOOKING DOWN", (50,50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 2)
        else:
            cv2.putText(frame, "CENTER", (50,50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,0), 2)

    cv2.imshow("Eye Tracking", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cv2.destroyAllWindows()
picam2.stop()
