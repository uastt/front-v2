// Set up basic variables for app
const record = document.querySelector(".record");
const stop = document.querySelector(".stop");
const upload = document.querySelector(".upload");
const uploadFile = document.querySelector("#uploadFile");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");
const mainSection = document.querySelector(".main-controls");

// Disable stop button while not recording
stop.disabled = true;

// Visualiser setup - create web audio api context and canvas
let audioCtx;
const canvasCtx = canvas.getContext("2d");

// Main block for doing the audio recording
if (navigator.mediaDevices.getUserMedia) {
  console.log("The mediaDevices.getUserMedia() method is supported.");

  const constraints = { audio: true };
  let chunks = [];

  let onSuccess = function (stream) {
    const mediaRecorder = new MediaRecorder(stream);

    visualize(stream);

    uploadFile.onchange = function(e) {
      //console.log(e);
      const url = (URL || webkit).createObjectURL(this.files[0]);
      //console.log(this.files[0]);
      chunks.push(this.files[0]);
      mediaRecorder.onstop(new Event('file-upload'));
    }

    record.onclick = function () {
      mediaRecorder.start();
      console.log(mediaRecorder.state);
      console.log("Recorder started.");
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;
    };

    stop.onclick = function () {
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      console.log("Recorder stopped.");
      record.style.background = "";
      record.style.color = "";

      stop.disabled = true;
      record.disabled = false;
    };

    mediaRecorder.onstop = async function (evt) {
      console.log("Last data to read (after MediaRecorder.stop() called).");
      console.log(evt);

      let fileName = "dictofon.webm";

      if (evt.type == 'file-upload') {
        fileName = chunks[0].name
      }

      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
      chunks = [];
      const audioURL = window.URL.createObjectURL(blob);
      console.log("recorder stopped");



      const clipName = prompt(
          "Enter a name for your sound clip?",
          "My unnamed clip"
      );


      const clipContainer = document.createElement("article");
      const clipLabel = document.createElement("p");
      const audio = document.createElement("audio");
      const deleteButton = document.createElement("button");

      clipContainer.classList.add("clip");
      audio.setAttribute("controls", "");
      deleteButton.textContent = "Delete";
      deleteButton.className = "delete";

      if (clipName === null) {
        clipLabel.textContent = "My unnamed clip";
      } else {
        clipLabel.textContent = clipName;
      }

      clipContainer.appendChild(audio);
      clipContainer.appendChild(clipLabel);
      clipContainer.appendChild(deleteButton);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      audio.src = audioURL;



      deleteButton.onclick = function (e) {
        e.target.closest(".clip").remove();
      };

      clipLabel.onclick = function () {
        const existingName = clipLabel.textContent;
        const newClipName = prompt("Enter a new name for your sound clip?");
        if (newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      };


      const formData  = new FormData();
      formData.append("audiofile", blob, fileName);
      //const response = await fetch('https://gpt.testme.cloud/api/1.0/transcribe', {method:"POST", body:formData});
      const response = await fetch('http://localhost:8019/api/1.0/transcribe', {method:"POST", body:formData});
      const responce = await response.json();
      console.log(responce);

      const responseContainer = document.createElement("div");
      const transcribed = document.createElement("div");
      transcribed.innerHTML = "<b>TRANSCRIBED:</b> "+responce.Text1;
      const postProcessed = document.createElement("div");
      postProcessed.innerHTML = "<b>POSTPROCESSED:</b> "+responce.Text2;
      const diff = document.createElement("div");
      diff.innerHTML = "<b>DIFF:</b> "+responce.Diff;
      const timeTook = document.createElement("div");
      timeTook.innerHTML = "<b>Time:</b> "+responce.TookTime
      responseContainer.appendChild(transcribed);
      responseContainer.appendChild(postProcessed);
      responseContainer.appendChild(diff);
      responseContainer.appendChild(timeTook);
      clipContainer.appendChild(responseContainer);
    };

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };
  };

  let onError = function (err) {
    console.log("The following error occured: " + err);
  };

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
} else {
  console.log("MediaDevices.getUserMedia() not supported on your browser!");
}

function visualize(stream) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  draw();

  function draw() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";

    canvasCtx.beginPath();

    let sliceWidth = (WIDTH * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * HEIGHT) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
}

window.onresize = function () {
  canvas.width = mainSection.offsetWidth;
};

window.onresize();
