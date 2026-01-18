chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url)
        return;
    const capsule = {
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
    await fetch(`${import.meta.env.VITE_API_URL}/capsules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(capsule)
    });
});
export {};
