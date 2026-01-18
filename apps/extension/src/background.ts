import type { Capsule } from "@capsule/contract";

chrome.action.onClicked.addListener(async tab => {
  if (!tab.url) return;

  const capsule: Omit<Capsule, "_id"> = {
    payload: {
      kind: "url",
      value: tab.url,
      meta: {
        title: tab.title ?? undefined
      }
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: {
      deviceId: "browser",
      client: "extension"
    },
    version: 1
  };

  await fetch("http://localhost:3000/capsules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(capsule)
  });
});
