"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const blendShapesRef = useRef(null);
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [mode, setMode] = useState("landmark");
  const [isMirrored, setIsMirrored] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const modes = ["landmark", "contour", "mesh"];

  useEffect(() => {
    const createFaceLandmarker = async () => {
      setIsModelLoading(true);
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath: "/models/face_landmarker.task",
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          }
        );
        setFaceLandmarker(landmarker);
        setIsModelLoading(false);
      } catch (error) {
        console.error("Failed to load FaceLandmarker model:", error);
        alert("Gagal memuat model pengenalan wajah. Silakan coba lagi nanti.");
        setIsModelLoading(false);
      }
    };

    createFaceLandmarker();
  }, []);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
          };
        }
        setCameraError(false);
      } catch (error) {
        console.error("Error accessing webcam:", error);
        setCameraError(true);
        alert(
          "Gagal mengakses webcam. Pastikan Anda memberikan izin dan webcam terhubung."
        );
      }
    };
    initCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const drawBlendShapes = useCallback((el, blendShapes) => {
    if (!el) return;

    if (
      !blendShapes ||
      blendShapes.length === 0 ||
      !blendShapes[0] ||
      !blendShapes[0].categories
    ) {
      el.innerHTML = `<li class="text-gray-400">Tidak ada wajah terdeteksi atau blend shapes tidak tersedia.</li>`;
      return;
    }

    let htmlMaker = "";
    blendShapes[0].categories.forEach((shape) => {
      htmlMaker += `
        <li class="blend-shapes-item flex justify-between items-center py-1">
          <span class="blend-shapes-label text-sm text-gray-300">${
            shape.displayName || shape.categoryName
          }</span>
          <div class="relative w-2/3 h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              class="absolute h-full bg-blue-500 rounded-full"
              style="width: ${(+shape.score * 100).toFixed(2)}%"
            ></div>
            <span class="absolute right-2 text-xs text-white z-10">${(+shape.score).toFixed(
              4
            )}</span>
          </div>
        </li>
      `;
    });
    el.innerHTML = htmlMaker;
  }, []);

  useEffect(() => {
    let rafId;
    let drawingUtilsInstance = null;

    const renderLoop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (
        !faceLandmarker ||
        !video ||
        !canvas ||
        !ctx ||
        video.readyState !== 4 ||
        video.videoWidth === 0 ||
        video.videoHeight === 0 ||
        video.clientWidth === 0 ||
        video.clientHeight === 0
      ) {
        rafId = requestAnimationFrame(renderLoop);
        return;
      }

      if (!drawingUtilsInstance) {
        drawingUtilsInstance = new DrawingUtils(ctx);
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const now = performance.now();
      const results = await faceLandmarker.detectForVideo(video, now);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isMirrored) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      if (results.faceLandmarks.length > 0) {
        for (const landmarks of results.faceLandmarks) {
          if (mode === "landmark" || mode === "mesh") {
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_TESSELATION,
              { color: "#C0C0C070", lineWidth: 1 }
            );
          }
          if (mode === "landmark" || mode === "contour") {
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
              { color: "#FF3030" }
            );
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
              { color: "#FF3030" }
            );
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
              { color: "#0000FF" }
            );
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
              { color: "#0000FF" }
            );
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
              { color: "#E0E0E0" }
            );
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LIPS,
              { color: "#E0E0E0" }
            );
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
              { color: "#FF3030" }
            );
            drawingUtilsInstance.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
              { color: "#0000FF" }
            );
          }
        }
        drawBlendShapes(blendShapesRef.current, results.faceBlendshapes);
      } else {
        drawBlendShapes(blendShapesRef.current, []);
      }

      if (isMirrored) {
        ctx.restore();
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [faceLandmarker, mode, isMirrored, drawBlendShapes]);

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center py-10 px-4">
      <div className="relative w-full max-w-[640px] aspect-video rounded-lg overflow-hidden border border-gray-600 shadow-lg bg-gray-800 flex items-center justify-center">
        {isModelLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 z-20 text-blue-400">
            Memuat model
          </div>
        )}
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-red-400 text-center p-4 z-10">
            <p>
              Akses kamera ditolak atau tidak tersedia. Pastikan webcam Anda
              terhubung dan Anda telah memberikan izin.
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover rounded-lg ${
                isMirrored ? "scale-x-[-1]" : ""
              }`}
            />
            <canvas
              ref={canvasRef}
              className="absolute rounded-lg"
            />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 justify-center items-center">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="cursor-pointer bg-gray-800 text-white px-6 py-2 rounded-md border border-gray-600 hover:bg-gray-700 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isModelLoading || cameraError}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}{" "}
            <i className="ri-arrow-down-s-line ml-2" />
          </button>

          {dropdownOpen && (
            <div className="absolute z-10 top-full mt-2 w-50 bg-gray-900 border border-gray-600 rounded-md shadow-lg text-sm overflow-hidden">
              {modes.map((m) => (
                <div
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setDropdownOpen(false);
                  }}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-800 transition-colors ${
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
          className="cursor-pointer px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600 hover:bg-gray-700 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            isMirrored
              ? "Nonaktifkan Mirroring (Tampilan Pengamat)"
              : "Aktifkan Mirroring (Tampilan Selfie)"
          }
          disabled={isModelLoading || cameraError}
        >
          <i className="ri-arrow-left-right-line text-white"></i>
        </button>
        <button
          onClick={() => setShowInfoPopup(true)}
          className="cursor-pointer bg-gray-900 text-white px-3 py-2 rounded-md border border-gray-600 hover:bg-gray-700 focus:outline-none transition-colors"
          title="Tentang Proyek Ini"
        >
          <i className="ri-information-line text-white"></i>
        </button>
      </div>

      <div className="mt-8 w-full max-w-[640px]">
        <h3 className="text-xl font-semibold mb-3 text-blue-300">
          Face Blendshapes
        </h3>
        <ul
          ref={blendShapesRef}
          className="blend-shapes-list bg-gray-800 p-4 rounded-md shadow-inner max-h-60 overflow-y-auto"
        >
          <li className="text-gray-400">Menunggu deteksi wajah...</li>
        </ul>
      </div>

      {showInfoPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75 p-4">
          <div className="relative bg-gray-800 text-white text-sm p-6 rounded-lg shadow-2xl max-w-md w-full flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-lg font-bold mb-4 text-blue-300">
                Tentang Proyek Ini
              </h2>
              <p className="text-sm leading-relaxed mb-4">
                Proyek Deteksi Landmark Wajah ini menggunakan kerangka kerja
                MediaPipe dan teknik visi komputer untuk melacak fitur wajah
                seperti mata, hidung, mulut, dan garis rahang secara real-time
                melalui webcam Anda. Dengan memanfaatkan model jaring wajah
                MediaPipe yang efisien, sistem ini dapat mendeteksi dan
                memetakan landmark wajah utama dengan akurasi tinggi,
                memungkinkan aplikasi potensial di bidang seperti pengenalan
                emosi, augmented reality, dan otentikasi wajah.
              </p>
            </div>
            <div className="flex justify-between items-end w-full mt-4 pt-4 border-t border-gray-700">
              <p className="text-[11px] text-gray-400">
                Muhammad Nefrit Mahardika © 2025 Analisis & Pemrosesan Citra Digital
              </p>
              <button
                onClick={() => setShowInfoPopup(false)}
                className="rounded-md px-4 py-1 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 focus:outline-none transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
