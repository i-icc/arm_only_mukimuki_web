import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";

testSupport([{ client: "Chrome" }]);

function getDistance(point1, point2, w, h) {
  const xd = Math.abs(point1.x - point2.x) * w;
  const yd = Math.abs(point1.y - point2.y) * h;
  const d = Math.sqrt(xd ** 2 + yd ** 2);
  return d;
}

function getRotate(point1, point2) {
  const x = (point1.x + point2.x) / 2;
  const y = (point1.y + point2.y) / 2;
  const r = Math.atan2(point2.y - point1.y, point2.x - point1.x) - Math.PI / 2;
  return [x, y, r];
}

function testSupport(supportedDevices) {
  const deviceDetector = new DeviceDetector();
  const detectedDevice = deviceDetector.parse(navigator.userAgent);
  let isSupported = false;
  for (const device of supportedDevices) {
    if (device.client !== undefined) {
      const re = new RegExp(`^${device.client}$`);
      if (!re.test(detectedDevice.client.name)) {
        continue;
      }
    }
    if (device.os !== undefined) {
      const re = new RegExp(`^${device.os}$`);
      if (!re.test(detectedDevice.os.name)) {
        continue;
      }
    }
    isSupported = true;
    break;
  }
  if (!isSupported) {
    alert(
      `This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
      `is not well supported at this time, expect some flakiness while we improve our code.`
    );
  }
}

const controls = window;
const drawingUtils = window;
const mpPose = window;
const options = {
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${mpPose.VERSION}/${file}`;
  },
};
const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const controlsElement = document.getElementsByClassName("control-panel")[0];
const canvasCtx = canvasElement.getContext("2d");
const spinner = document.querySelector(".loading");
spinner.ontransitionend = () => {
  spinner.style.display = "none";
};
let visibleDebug = true;
const threshold = 0.65;
const arm2 = new Image();
arm2.src = "./images/arm2.png";

const drawImage = (image, point1, point2, w, h) => {
  canvasCtx.save();

  const xyr = getRotate(point1, point2)
  canvasCtx.translate(xyr[0] * w, xyr[1] * h);
  canvasCtx.rotate(xyr[2]);

  const image_height = getDistance(point1, point2, w, h) * 1.3;
  const image_width = image_height * image.width / image.height;
  canvasCtx.drawImage(image, -image_width / 2, -image_height / 2, image_width, image_height);

  canvasCtx.restore();
}

function onResults(results) {
  document.body.classList.add("loaded");
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );
  // Connecting the points with the line
  if (results.poseLandmarks && visibleDebug) {
    drawingUtils.drawConnectors(
      canvasCtx,
      results.poseLandmarks,
      mpPose.POSE_CONNECTIONS,
      { visibilityMin: 0.65, color: "white" }
    );
    drawingUtils.drawLandmarks(
      canvasCtx,
      Object.values(mpPose.POSE_LANDMARKS_LEFT).map(
        (index) => results.poseLandmarks[index]
      ),
      { visibilityMin: 0.65, color: "white", fillColor: "rgb(255,138,0)" }
    );
    drawingUtils.drawLandmarks(
      canvasCtx,
      Object.values(mpPose.POSE_LANDMARKS_RIGHT).map(
        (index) => results.poseLandmarks[index]
      ),
      { visibilityMin: 0.65, color: "white", fillColor: "rgb(0,217,231)" }
    );
    drawingUtils.drawLandmarks(
      canvasCtx,
      Object.values(mpPose.POSE_LANDMARKS_NEUTRAL).map(
        (index) => results.poseLandmarks[index]
      ),
      { visibilityMin: 0.65, color: "white", fillColor: "white" }
    );
  }
  // Show arms
  // ここにコード書く
  if (results.poseLandmarks) {
    const poses = results.poseLandmarks
    let w = canvasElement.width;
    let h = canvasElement.height;
    // 左腕2
    if (poses[12].visibility > threshold && poses[14].visibility > threshold) {
      drawImage(arm2, poses[12], poses[14], w, h)

      // const arm2_length = getDistance(poses[12], poses[14], w, h);
      // canvasCtx.drawImage(arm2, poses[12].x * w, poses[12].y * h, arm2_length * arm2.width / arm2.height, arm2_length);
    };
  }
  // kokomade
  canvasCtx.restore();
}

const pose = new mpPose.Pose(options);

pose.onResults(onResults);
new controls.ControlPanel(controlsElement, {
  selfieMode: true,
  modelComplexity: 1,
  visibleDebug: true,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  effect: "background",
})
  .add([
    new controls.StaticText({ title: "腕だけムキムキweb" }),
    new controls.SourcePicker({
      onSourceChanged: () => {
        pose.reset();
      },
      onFrame: async (input, size) => {
        const aspect = size.height / size.width;
        let width, height;
        if (window.innerWidth > window.innerHeight) {
          height = window.innerHeight;
          width = height / aspect;
        } else {
          width = window.innerWidth;
          height = width * aspect;
        }
        canvasElement.width = width;
        canvasElement.height = height;
        await pose.send({ image: input });
      },
    }),
    new controls.Toggle({ title: "Veiw Debug", field: "visibleDebug" }),
  ])
  .on((x) => {
    const options = x;
    visibleDebug = x.visibleDebug;
    videoElement.classList.toggle("selfie", options.selfieMode);
    pose.setOptions(options);
  });
