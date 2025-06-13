"use client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [mode, setMode] = useState("landmark");
  const [isMirrored, setIsMirrored] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const modes = ["landmark", "contour", "mesh"];
  const [showInfoPopup, setShowInfoPopup] = useState(false);


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
    let rafId;

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

        if (results.faceLandmarks.length > 0) {
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
              (mode === "contour" &&
                [10, 234, 454, 152, 67, 297].includes(i)) ||
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

      rafId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(rafId);
  }, [faceLandmarker, mode, isMirrored]);

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center py-10 px-4">
      <div className="relative w-full max-w-[640px] aspect-video rounded overflow-hidden border border-gray-600">
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
            className="cursor-pointer bg-gray-800 text-white px-6 py-2 rounded-md border border-gray-600 hover:bg-gray-700 focus:outline-none"
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}{" "}
            <i className="ri-arrow-down-s-line ml-2" />
          </button>

          {dropdownOpen && (
            <div className="absolute z-10 top-full mt-2 w-50 bg-gray-900 border border-gray-600 rounded-xs shadow-lg text-sm">
              {modes.map((m) => (
                <div
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setDropdownOpen(false);
                  }}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-800 ${
                    mode === m ? "bg-gray-700 text-white font-semibold" : ""
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setIsMirrored(!isMirrored)}
          className="cursor-pointer px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600 hover:bg-gray-700 focus:outline-none"
        >
          <i className="ri-arrow-left-right-line text-white"></i>
        </button>
        <button
          onClick={() => setShowInfoPopup(true)}
          className="cursor-pointer bg-gray-900 text-white px-3 py-2 rounded-md border border-gray-600 hover:bg-gray-700 focus:outline-none"
        >
          <i class="ri-information-line text-white"></i>
        </button>
      </div>

      {showInfoPopup && (
        <div className="absolute inset-0 flex items-center justify-center z-50 rounded-md">
          <div className="relative bg-gray-800 text-white text-sm p-6 rounded-md shadow-lg w-125 h-60 flex flex-col items-left ">
            <button
              onClick={() => setShowInfoPopup(false)}
              className="absolute rounded-md bottom-4 right-4 px-4 py-1 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 focus:outline-none"
            >
              Close
            </button>
            <p className="text-sm">
              Face Landmark Detection project uses the MediaPipe framework and
              computer vision techniques to track facial features such as the
              eyes, nose, mouth, and jawline in real-time through a webcam. By
              leveraging MediaPipe's efficient face mesh model, the system can
              detect and map key facial landmarks with high accuracy, enabling
              potential applications in areas like emotion recognition,
              augmented reality, and facial authentication.
            </p>
            <p className="absolute left-4 bottom-6 text-[11px]">
              Muhammad Nefrit Mahardika © 2025 Digital Image
              Analysis & Processing
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
