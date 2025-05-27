document.addEventListener("DOMContentLoaded", () => {
  // Service Worker registration
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => console.log("Service Worker Registered"))
      .catch((err) => console.error("Service Worker Registration failed:", err));
  }

  // GSAP animations for hero and tool cards
  gsap.from(".hero-content h1", {
    duration: 1,
    y: -50,
    opacity: 0,
    ease: "power3.out",
  });

  gsap.from(".hero-content p", {
    duration: 1.2,
    delay: 0.3,
    y: -30,
    opacity: 0,
    ease: "power3.out",
  });

  gsap.from(".upload-box", {
    duration: 1,
    delay: 0.5,
    scale: 0.9,
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

  // Background Removal
  window.removeBg = async () => {
    const fileInput = document.getElementById("fileInput");
    const bgStatus = document.getElementById("bgStatus");
    const loader = document.getElementById("loader-bg");
    const originalImage = document.getElementById("originalImage");
    const outputCanvas = document.getElementById("outputCanvas");
    const downloadLink = document.getElementById("downloadLink");

    if (!fileInput.files[0]) {
      bgStatus.textContent = "Please upload an image.";
      return;
    }

    bgStatus.textContent = "Processing...";
    loader.style.display = "block";

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      originalImage.src = e.target.result;
      originalImage.style.display = "block";

      try {
        const session = await ort.InferenceSession.create(
          "https://pixelevate.netlify.app/modnet-16.onnx"
        );
        const img = new Image();
        img.src = e.target.result;

        await new Promise((res) => (img.onload = res));

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 320;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        const input = new Float32Array(size * size * 3);
        for (let i = 0; i < size * size; i++) {
          input[i * 3] = data[i * 4] / 255.0; // R
          input[i * 3 + 1] = data[i * 4 + 1] / 255.0; // G
          input[i * 3 + 2] = data[i * 4 + 2] / 255.0; // B
        }

        const inputTensor = new ort.Tensor("float32", input, [1, 3, size, size]);
        const feeds = { input: inputTensor };
        const results = await session.run(feeds);
        const output = results.output.data;

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
        outputCanvas.width = size;
        outputCanvas.height = size;
        outputCanvas.getContext("2d").drawImage(maskCanvas, 0, 0);
        outputCanvas.style.display = "block";

        downloadLink.href = outputCanvas.toDataURL("image/png");
        downloadLink.style.display = "block";
        bgStatus.textContent = "Background Removed!";
      } catch (err) {
        bgStatus.textContent = "Error processing image.";
        console.error(err);
      } finally {
        loader.style.display = "none";
      }
    };
    reader.readAsDataURL(file);
  };

  // Crop Image
  let cropperInstance;
  window.cropImage = () => {
    const cropInput = document.getElementById("cropInput");
    const cropStatus = document.getElementById("cropStatus");
    const loader = document.getElementById("loader-crop");
    const cropImage = document.getElementById("cropImage");
    const cropResult = document.getElementById("cropResult");

    if (!cropInput.files[0]) {
      cropStatus.textContent = "Please upload an image.";
      return;
    }

    cropStatus.textContent = "Processing...";
    loader.style.display = "block";

    const file = cropInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      cropImage.src = e.target.result;
      cropImage.style.display = "block";

      if (cropperInstance) cropperInstance.destroy();

      cropperInstance = new Cropper(cropImage, {
        aspectRatio: NaN,
        viewMode: 1,
        background: false,
        zoomable: true,
        scalable: false,
        movable: true,
        autoCropArea: 1,
      });

      setTimeout(() => {
        const canvas = cropperInstance.getCroppedCanvas({
          width: 800,
          height: 800,
        });
        cropResult.width = 800;
        cropResult.height = 800;
        cropResult.getContext("2d").drawImage(canvas, 0, 0);
        cropResult.style.display = "block";
        cropStatus.textContent = "Image Cropped!";
        loader.style.display = "none";
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  // Unzip File
  window.unzipFile = async () => {
    const zipInput = document.getElementById("zipInput");
    const zipStatus = document.getElementById("zipStatus");
    const loader = document.getElementById("loader-zip");
    const output = document.getElementById("output");

    if (!zipInput.files[0]) {
      zipStatus.textContent = "Please upload a ZIP file.";
      return;
    }

    zipStatus.textContent = "Unzipping...";
    loader.style.display = "block";

    const file = zipInput.files[0];
    const jszip = window.JSZip;
    try {
      const zip = await jszip.loadAsync(file);
      let filesList = "<ul>";
      for (const filename of Object.keys(zip.files)) {
        filesList += `<li>${filename}</li>`;
      }
      filesList += "</ul>";
      output.innerHTML = `Unzipped files:${filesList}`;
      zipStatus.textContent = "Unzipped Successfully!";
    } catch (error) {
      output.innerHTML = "Failed to unzip file.";
      zipStatus.textContent = "Error unzipping file.";
      console.error(error);
    } finally {
      loader.style.display = "none";
    }
  };

  // Placeholder for Image Enhancement
  window.enhanceImage = () => {
    const enhanceInput = document.getElementById("enhanceInput");
    const enhanceStatus = document.getElementById("enhanceStatus");
    const loader = document.getElementById("loader-enhance");
    const enhancedImage = document.getElementById("enhancedImage");

    if (!enhanceInput.files[0]) {
      enhanceStatus.textContent = "Please upload an image.";
      return;
    }

    enhanceStatus.textContent = "Enhancing...";
    loader.style.display = "block";

    const file = enhanceInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      enhancedImage.src = e.target.result; // Placeholder: no actual enhancement
      enhancedImage.style.display = "block";
      enhanceStatus.textContent = "Image Enhanced (Placeholder)!";
      loader.style.display = "none";
    };
    reader.readAsDataURL(file);
  };
});
