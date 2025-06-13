"use client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [mode, setMode] = useState("landmark");
  const [isMirrored, setIsMirrored] = useState(false);

  useEffect(() => {
    const initCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };
    initCamera();
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );

      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
        runningMode: "VIDEO",
        numFaces: 1,
      });

      setFaceLandmarker(landmarker);
    };

    loadModel();
  }, []);

  const renderLoop = async () => {
    if (faceLandmarker && videoRef.current?.readyState === 4) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const now = performance.now();
      const results = await faceLandmarker.detectForVideo(video, now);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results && results.faceLandmarks.length > 0) {
        const points = results.faceLandmarks[0];

        ctx.save();
        if (isMirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.fillStyle = "#00FF00";
        ctx.lineWidth = 1;

        points.forEach((pt, i) => {
          if (
            (mode === "landmark" && i % 5 === 0) ||
            (mode === "contour" && [10, 234, 454, 152, 67, 297].includes(i)) ||
            mode === "mesh"
          ) {
            ctx.beginPath();
            ctx.arc(
              pt.x * canvas.width,
              pt.y * canvas.height,
              2,
              0,
              2 * Math.PI
            );
            ctx.fill();
          }
        });

        ctx.restore();
      }
    }

    requestAnimationFrame(renderLoop);
  };

  useEffect(() => {
    renderLoop();
  }, [faceLandmarker, mode, isMirrored]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const modes = ["landmark", "contour", "mesh"];

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-10 px-4">
      <h1 className="text-2xl font-medium mb-6">
        🧑‍💻 Face Landmark Detection
      </h1>

      <div className="relative w-max-[640px] h-max-[480px] rounded overflow-hidden shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rounded"
          style={{ transform: isMirrored ? "scaleX(-1)" : "scaleX(1)" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 justify-center items-center">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-gray-800 text-white px-10 py-2 rounded-md border border-gray-600 hover:bg-gray-700 focus:outline-none"
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)} <i class="ri-arrow-up-s-line"></i>
          </button>

          {dropdownOpen && (
            <div className="absolute z-10 bottom-full mb-2 w-40 bg-gray-900 border border-gray-600 rounded-md shadow-lg">
              {modes.map((m) => (
                <div
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setDropdownOpen(false);
                  }}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-700 ${
                    mode === m ? "bg-green-600 text-black font-semibold" : ""
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mirror toggle */}
        <button
          onClick={() => setIsMirrored(!isMirrored)}
          className="px-4 py-2 rounded-md border bg-blue-500 text-black font-semibold hover:bg-blue-600"
        >
          {isMirrored ? "Unmirror" : "Mirror"} Camera
        </button>
      </div>
    </main>
  );
}
