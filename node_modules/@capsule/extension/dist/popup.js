const status = document.getElementById("status");
async function sendCapsule(capsule) {
    status.textContent = "Sending…";
    const res = await fetch("http://localhost:3000/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(capsule)
    });
    if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
    }
    status.textContent = "Sent ✓";
    setTimeout(() => window.close(), 500);
}
async function getSelectionText() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });
    if (!tab?.id)
        return null;
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() ?? null
    });
    return result?.trim() || null;
}
async function getTabInfo() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });
    if (!tab?.url)
        throw new Error("No active tab");
    return tab;
}
document
    .getElementById("send-selection")
    .addEventListener("click", async () => {
    try {
        const selection = await getSelectionText();
        const tab = await getTabInfo();
        if (!selection) {
            status.textContent = "No selection found";
            return;
        }
        const capsule = {
            payload: {
                kind: "text",
                value: selection,
                meta: {
                    title: tab.title ?? undefined,
                    description: tab.url
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
        await sendCapsule(capsule);
    }
    catch (err) {
        console.error(err);
        status.textContent = "Failed to send";
    }
});
document
    .getElementById("send-page")
    .addEventListener("click", async () => {
    try {
        const tab = await getTabInfo();
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
        await sendCapsule(capsule);
    }
    catch (err) {
        console.error(err);
        status.textContent = "Failed to send";
    }
});
export {};
