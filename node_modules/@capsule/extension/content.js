chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_VIDEO_MOMENT") {
    const videos = document.querySelectorAll("video");

    if (!videos || videos.length === 0) {
      sendResponse(null);
      return;
    }

    // Pick the first video that is actually playing or has progressed
    const video =
      Array.from(videos).find(v => v.currentTime > 0) || videos[0];

    sendResponse({
      currentTime: Math.floor(video.currentTime)
    });
  }
});
