// Runs inside the web page

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_VIDEO_MOMENT") {
    const video = document.querySelector("video");

    if (!video) {
      sendResponse(null);
      return;
    }

    sendResponse({
      currentTime: Math.floor(video.currentTime),
      duration: Math.floor(video.duration || 0)
    });
  }
});
