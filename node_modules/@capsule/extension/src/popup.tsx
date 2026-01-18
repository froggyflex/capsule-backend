import React from "react";

export default function Popup() {
  async function capsuleMoment() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id || !tab.url) return;

    const moment = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_VIDEO_MOMENT"
    });

    let url = tab.url;

    if (moment?.currentTime) {
      const t = moment.currentTime;
      url += url.includes("?") ? `&t=${t}` : `?t=${t}`;
    }

    await fetch("http://localhost:3000/capsules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: {
          kind: "url",
          value: url,
          meta: {
            title: `Video @ ${moment?.currentTime ?? 0}s`
          }
        },
        source: {
          deviceId: "pc",
          client: "extension"
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      })
    });

    window.close();
  }

  return (
    <div style={{ padding: 12 }}>
      <button onClick={capsuleMoment}>
        Capsule this moment
      </button>
    </div>
  );
}
