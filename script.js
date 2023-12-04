let video;

async function startWebcamAndRegister() {
  await loadModelsAndStartWebcam(); // Load models and start webcam
  registerFace(); // Register face after loading models and starting webcam
}

// Loads models required for face recognition and starts webcam
async function loadModelsAndStartWebcam() {
  await Promise.all([
    // Load face recognition models from specified directory
    faceapi.nets.ssdMobilenetv1.loadFromUri("../models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("../models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("../models"),
  ]);

  startWebcam(); // Start webcam after loading models
}

// Starts webcam and sets video element source to the webcam stream
async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  video = document.getElementById("video");
  video.srcObject = stream;
}

// Registers the detected face and saves face data for a specified name in local storage
function registerFace() {
  const name = document.getElementById("nameInput").value.trim();

  if (name === "") {
    alert("Please enter a name before registering your face.");
    return;
  }

  if (!video) {
    video = document.getElementById("video");
  }

  const canvas = document.getElementById("overlay");
  const canvasContext = canvas.getContext("2d");

  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then(async (stream) => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);

        faceapi
          .detectSingleFace(canvas)
          .withFaceLandmarks()
          .withFaceDescriptor()
          .then(async (detection) => {
            if (!detection) {
              alert("No face detected. Please try again.");
              return;
            }

            const faceDescriptors = detection.descriptor;

            const registeredFaces =
              JSON.parse(localStorage.getItem("registeredFaces")) || {};
            if (!registeredFaces[name]) {
              registeredFaces[name] = [];
            }

            // Store face descriptors as Float32Array
            const float32Descriptors = Array.from(faceDescriptors);
            registeredFaces[name].push(float32Descriptors);
            localStorage.setItem(
              "registeredFaces",
              JSON.stringify(registeredFaces)
            );

            console.log(`Face registered for ${name}:`, float32Descriptors);
            alert(`Face registered for ${name}!`);

            // Update the displayed list of registered names
            listRegisteredNames();
          });
      };
    })
    .catch((error) => {
      console.error(error);
    });
}
// Matches the detected face with registered faces and performs authentication
function matchFace() {
  const canvas = document.getElementById("overlay");
  const canvasContext = canvas.getContext("2d");

  const registeredFaces =
    JSON.parse(localStorage.getItem("registeredFaces")) || {};

  const video = document.getElementById("video");
  if (!video) {
    console.error("Video element not found.");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);

        faceapi
          .detectSingleFace(canvas)
          .withFaceLandmarks()
          .withFaceDescriptor()
          .then((detection) => {
            if (!detection) {
              alert("No face detected. Please try again.");
              return;
            }

            const faceDescriptors = detection.descriptor;

            // Find best match among registered faces
            let bestMatch = { label: "", distance: Number.MAX_VALUE };
            for (const name in registeredFaces) {
              const labeledDescriptors = registeredFaces[name].map(
                (descriptor) =>
                  new faceapi.LabeledFaceDescriptors(name, [
                    new Float32Array(descriptor),
                  ])
              );
              const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
              const match = faceMatcher.findBestMatch(faceDescriptors);
              if (match.distance < bestMatch.distance) {
                bestMatch = match;
              }
            }

            if (bestMatch.label !== "" && bestMatch.distance < 0.8) {
              console.log(`Face matched for ${bestMatch.label}. Welcome!`);
              alert(`Face matched for ${bestMatch.label}. Welcome!`);
              // Proceed with your login logic here...
            } else {
              console.log("Face not recognized or distance too high.");
              alert("Face not recognized or distance too high.");
            }
          });
      };
    })
    .catch((error) => {
      console.error(error);
    });
}

// Lists names of registered faces in the UI
function listRegisteredNames() {
  const registeredFaces =
    JSON.parse(localStorage.getItem("registeredFaces")) || {};
  const namesList = document.getElementById("registeredNames");

  namesList.innerHTML = "<strong>Registered Names:</strong><br>";

  for (const name in registeredFaces) {
    namesList.innerHTML += `${name}<br>`;
  }
}

// Initiates webcam and registration process when the DOM content is loaded
document.addEventListener("DOMContentLoaded", startWebcamAndRegister);
