// Set up basic variables for app
const record = document.querySelector(".record");
const stop = document.querySelector(".stop");
const uploadFile = document.querySelector("#uploadFile");
const exportTextsButton = document.querySelector(".export");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");
const mainSection = document.querySelector(".main-controls");

// Disable stop button while not recording
stop.disabled = true;

// Visualiser setup - create web audio api context and canvas
let audioCtx;
const canvasCtx = canvas.getContext("2d");

//get password from storage
const globPasswordField = document.querySelector("#globPassword");
globPasswordField.value = localStorage.getItem("globPassword");
globPasswordField.addEventListener("change", function (e) {
  console.log(e);
  localStorage.setItem("globPassword", e.target.value);
})

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
      for (let i=0; i<this.files.length; i++) {
        chunks.push(this.files[i]);
        mediaRecorder.onstop(new Event('file-upload'));
      }
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

    exportTextsButton.onclick = function () {
      exportTexts();
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



/*      const clipName = prompt(
          "Enter a name for your sound clip?",
          "My unnamed clip"
      );*/


      const clipContainer = document.createElement("article");
      const clipLabel = document.createElement("p");
      clipLabel.className = "_clipLabel";
      clipLabel.classList.add("_waiting");
      const audio = document.createElement("audio");
      const deleteButton = document.createElement("button");

      clipContainer.classList.add("clip");
      clipContainer.setAttribute("status", "pending");
      audio.setAttribute("controls", "");
      deleteButton.textContent = "Delete";
      deleteButton.className = "delete";

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
        const newClipName = prompt("Enter a new name for your sound clip?", existingName);
        if (newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      };


      const waiting = document.createElement("div");
      const waitingColor = document.createElement("div");
      //waiting.innerHTML = "<b>processing...</b> ";
      waiting.className = "progress";
      waitingColor.className = "color";
      waiting.appendChild(waitingColor);
      clipContainer.appendChild(waiting);

      const formData  = new FormData();
      formData.append("audiofile", blob, fileName);

      formData.append("globPassword", globPasswordField.value);

      if (evt.type == 'file-upload') {
        clipLabel.textContent = fileName;
      } else {
        clipLabel.textContent = "Голос";
      }

      let apiURL = 'http://localhost:8020/api/1.0/transcribe';
      if (document.location.hostname != "localhost") {
        apiURL = "https://gpt2.testme.cloud/api/1.0/transcribe";
      }

      const responseContainer = document.createElement("div");

      const response = await fetch(apiURL, {method:"POST", body:formData}).catch(
          function (err) {
            console.log('err!');
            const error = document.createElement("div");
            error.innerHTML = "<b>ERROR sending request:</b> " + err;
            responseContainer.appendChild(error);
            clipLabel.classList.replace("_waiting", "_error");
          }
      );

      waiting.remove();
      //const response = await fetch('http://localhost:8019/api/1.0/transcribe', {method:"POST", body:formData});
      if (response != undefined) {
        const responseJson = await response.json();

        if (responseJson.Status == "OK") {
          clipLabel.classList.replace("_waiting", "_ok");

          const transcribedHeader = document.createElement("h4");
          transcribedHeader.innerText = "TRANSCRIBED"
          const transcribed = document.createElement("div");
          transcribed.innerHTML = responseJson.Text1;
          transcribed.className = "_transcribed";
          const postProcessedHeader = document.createElement("h4");
          postProcessedHeader.innerText = "POSTPROCESSED"
          const postProcessed = document.createElement("div");
          postProcessed.innerHTML = responseJson.Text2;
          postProcessed.className = "_postprocessed";
          const diffHeader = document.createElement("h4");
          diffHeader.innerText = "DIFF"
          const diff = document.createElement("div");
          diff.innerHTML = responseJson.Diff;
          diff.className = "_diff";
          const timeTook = document.createElement("div");
          timeTook.innerHTML = "<b>Time:</b> " + responseJson.TookTime
          responseContainer.appendChild(transcribedHeader);
          responseContainer.appendChild(transcribed);
          responseContainer.appendChild(postProcessedHeader);
          responseContainer.appendChild(postProcessed);
          responseContainer.appendChild(diffHeader);
          responseContainer.appendChild(diff);
          responseContainer.appendChild(timeTook);
        } else {
          const error = document.createElement("div");
          error.innerHTML = "<b>ERROR:</b> " + responseJson.Status;
          responseContainer.appendChild(error);
        }
      } else {
        console.log('not ok!')
      }
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


function exportTexts() {
  const clipLabel = document.getElementsByClassName("_clipLabel _ok");
  const transcribed = document.getElementsByClassName("_transcribed");
  const postProcessed = document.getElementsByClassName("_postprocessed");
  const diff = document.getElementsByClassName("_diff");

  const newWin = open('','fdsfd','');
  /*newWin.document.write('<html><head><style>' +
      'td {' +
      ' padding:5px;' +
      ' border:1px solid grey;' +
      '}' +
      '</style></head><body></body></html>');*/



  //const html = document.createElement("html");
  const head = newWin.document.querySelector("head");

  const style = document.createElement('style');
  const encoding = document.createElement('meta');
  encoding.setAttribute("charset", "UTF-8");

  head.appendChild(encoding);
  head.appendChild(style);
  const css = 'td {' +
      ' padding:5px;' +
      ' border:1px solid grey;' +
      '}'
  style.appendChild(document.createTextNode(css));

  const body = newWin.document.querySelector("body");
  const table = document.createElement("table");

  for (let i=0; i<transcribed.length; i++) {
    const tr = document.createElement("tr");

    const td1 = document.createElement("td");
    td1.innerHTML = transcribed[i].innerHTML + "<br>---<br>" + clipLabel[i].innerHTML;
    tr.appendChild(td1);
    console.log(td1);
    const td2 = document.createElement("td");
    td2.innerHTML = postProcessed[i].innerHTML;
    tr.appendChild(td2);
    const td3 = document.createElement("td");
    td3.innerHTML = diff[i].innerHTML;
    tr.appendChild(td3);

    table.appendChild(tr);
  }

  body.appendChild(table);

  download("export.html", newWin.document.querySelector("html").innerHTML)
}

function download(filename, data) {
  const blob = new Blob([data], {type: 'text/csv'});
  if(window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename);
  }
  else{
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }
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
