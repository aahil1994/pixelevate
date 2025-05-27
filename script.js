// script.js

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('Service Worker Registered'))
      .catch(err => console.log('Service Worker Registration Failed:', err));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const darkToggle = document.getElementById("toggle-dark");

  // Dark mode toggle
  darkToggle?.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    if (document.body.classList.contains("light-mode")) {
      document.body.style.backgroundColor = "#f0f0f0";
      document.body.style.color = "#111";
    } else {
      document.body.style.backgroundColor = "#121212";
      document.body.style.color = "#fff";
    }
  });

  // GSAP animations
  gsap.from(".hero h2", { duration: 1, y: -50, opacity: 0, ease: "power3.out" });
  gsap.from(".hero p", { duration: 1.2, delay: 0.3, y: -30, opacity: 0, ease: "power3.out" });
  gsap.from(".tool-card", {
    scrollTrigger: ".tool-card",
    duration: 0.8,
    y: 30,
    opacity: 0,
    stagger: 0.2,
    ease: "power2.out"
  });
});

let cropper;

document.getElementById('cropInput')?.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    const img = document.getElementById('cropImage');
    img.style.display = 'block';
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      if (cropper) cropper.destroy();
      cropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1
      });
    };
  }
});

function cropImage() {
  const canvas = document.getElementById('cropResult');
  if (cropper) {
    const croppedCanvas = cropper.getCroppedCanvas();
    canvas.style.display = 'block';
    canvas.width = croppedCanvas.width;
    canvas.height = croppedCanvas.height;
    canvas.getContext('2d').drawImage(croppedCanvas, 0, 0);
  }
}

function unzipFile() {
  const input = document.getElementById('fileInput');
  const output = document.getElementById('output');
  const file = input.files[0];

  if (file && file.name.endsWith('.zip')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      JSZip.loadAsync(e.target.result).then(zip => {
        output.innerHTML = '';
        Object.keys(zip.files).forEach(filename => {
          output.innerHTML += `<p>✅ ${filename}</p>`;
        });
      });
    };
    reader.readAsArrayBuffer(file);
  } else {
    output.innerHTML = '<p>Please upload a .zip file</p>';
  }
}

async function removeBg() {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return alert("Please select an image");

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 512;
  ctx.drawImage(img, 0, 0, 512, 512);

  const imageData = ctx.getImageData(0, 0, 512, 512);
  const input = new Float32Array(1 * 3 * 512 * 512);
  for (let i = 0; i < 512 * 512; i++) {
    input[i] = imageData.data[i * 4] / 255;
    input[i + 512 * 512] = imageData.data[i * 4 + 1] / 255;
    input[i + 2 * 512 * 512] = imageData.data[i * 4 + 2] / 255;
  }

  const tensor = new ort.Tensor("float32", input, [1, 3, 512, 512]);
  const session = await ort.InferenceSession.create("models/modnet_webnn.onnx");
  const feeds = { "input": tensor };
  const results = await session.run(feeds);

  const alpha = results.output.data;
  const outputCanvas = document.getElementById("outputCanvas");
  outputCanvas.width = 512;
  outputCanvas.height = 512;
  const outputCtx = outputCanvas.getContext("2d");
  const outputImage = outputCtx.createImageData(512, 512);

  for (let i = 0; i < 512 * 512; i++) {
    outputImage.data[i * 4] = imageData.data[i * 4];
    outputImage.data[i * 4 + 1] = imageData.data[i * 4 + 1];
    outputImage.data[i * 4 + 2] = imageData.data[i * 4 + 2];
    outputImage.data[i * 4 + 3] = Math.min(Math.max(Math.round(alpha[i] * 255), 0), 255);
  }

  document.getElementById("originalImage").src = img.src;
  outputCtx.putImageData(outputImage, 0, 0);

  const downloadLink = document.getElementById("downloadLink");
  downloadLink.href = outputCanvas.toDataURL("image/png");
  downloadLink.style.display = "inline-block";
}
