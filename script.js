// Wait until DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Service Worker registration for PWA support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => console.log("Service Worker Registered"))
      .catch((err) => console.error("Service Worker Registration failed:", err));
  }

  // Dark mode toggle button
  const darkToggle = document.getElementById("toggle-dark");
  darkToggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  // GSAP animations for hero and tool cards
  gsap.from(".hero h2", {
    duration: 1,
    y: -50,
    opacity: 0,
    ease: "power3.out",
  });

  gsap.from(".hero p", {
    duration: 1.2,
    delay: 0.3,
    y: -30,
    opacity: 0,
    ease: "power3.out",
  });

  gsap.from(".tool-card", {
    scrollTrigger: ".tool-card",
    duration: 0.8,
    y: 30,
    opacity: 0,
    stagger: 0.2,
    ease: "power2.out",
  });

  // CropperJS setup
  const imageInput = document.getElementById("upload-image");
  const cropperContainer = document.getElementById("cropper-container");
  let cropperInstance;

  imageInput?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Clear previous cropper
    cropperContainer.innerHTML = "";

    const img = document.createElement("img");
    img.id = "image-to-crop";
    img.style.maxWidth = "100%";
    cropperContainer.appendChild(img);

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;

      if (cropperInstance) cropperInstance.destroy();

      // Initialize CropperJS
      cropperInstance = new Cropper(img, {
        aspectRatio: NaN,
        viewMode: 1,
        background: false,
        zoomable: true,
        scalable: false,
        movable: true,
        autoCropArea: 1,
      });
    };
    reader.readAsDataURL(file);
  });

  // Crop image and show preview
  const cropBtn = document.getElementById("crop-image");
  const cropPreview = document.getElementById("crop-preview");

  cropBtn?.addEventListener("click", () => {
    if (!cropperInstance) return alert("Please upload and select an image first.");

    const canvas = cropperInstance.getCroppedCanvas({
      width: 800,
      height: 800,
    });

    cropPreview.innerHTML = "";
    const croppedImage = new Image();
    croppedImage.src = canvas.toDataURL("image/png");
    croppedImage.style.maxWidth = "100%";
    cropPreview.appendChild(croppedImage);
  });

  // JSZip file unzipper
  const zipInput = document.getElementById("upload-zip");
  const unzipResult = document.getElementById("unzip-result");

  zipInput?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    unzipResult.innerHTML = "Unzipping...";

    const jszip = window.JSZip;
    try {
      const zip = await jszip.loadAsync(file);
      let filesList = "<ul>";
      for (const filename of Object.keys(zip.files)) {
        filesList += `<li>${filename}</li>`;
      }
      filesList += "</ul>";
      unzipResult.innerHTML = `Unzipped files:${filesList}`;
    } catch (error) {
      unzipResult.innerHTML = "Failed to unzip file.";
      console.error(error);
    }
  });

  // Background removal with ONNX ModNet model
  const bgRemoveInput = document.getElementById("upload-bg-remove");
  const bgRemoveResult = document.getElementById("bg-remove-result");

  async function removeBackground(imageDataURL) {
    bgRemoveResult.innerHTML = "Processing background removal...";

    try {
      // Load ONNX model
      const session = await ort.InferenceSession.create(
        "https://pixelevate.netlify.app/modnet-16.onnx"
      );

      // Prepare input tensor from image
      const img = new Image();
      img.src = imageDataURL;

      await new Promise((res) => (img.onload = res));

      // Resize and normalize image to match model input (320x320 RGB normalized)
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // Prepare input float32 array normalized
      const input = new Float32Array(size * size * 3);
      for (let i = 0; i < size * size; i++) {
        input[i * 3] = data[i * 4] / 255.0; // R
        input[i * 3 + 1] = data[i * 4 + 1] / 255.0; // G
        input[i * 3 + 2] = data[i * 4 + 2] / 255.0; // B
      }

      const inputTensor = new ort.Tensor("float32", input, [1, 3, size, size]);

      // Run inference
      const feeds = { input: inputTensor };
      const results = await session.run(feeds);
      const output = results.output.data; // Float32Array of size 320*320

      // Create mask canvas
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = size;
      maskCanvas.height = size;
      const maskCtx = maskCanvas.getContext("2d");
      const maskImageData = maskCtx.createImageData(size, size);

      for (let i = 0; i < size * size; i++) {
        const alpha = output[i] * 255;
        maskImageData.data[i * 4] = 255;
        maskImageData.data[i * 4 + 1] = 255;
        maskImageData.data[i * 4 + 2] = 255;
        maskImageData.data[i * 4 + 3] = alpha;
      }

      maskCtx.putImageData(maskImageData, 0, 0);

      // Show result
      bgRemoveResult.innerHTML = "";
      bgRemoveResult.appendChild(maskCanvas);
    } catch (err) {
      bgRemoveResult.innerHTML = "Error processing background removal.";
      console.error(err);
    }
  }

  bgRemoveInput?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      removeBackground(e.target.result);
    };
    reader.readAsDataURL(file);
  });
});
