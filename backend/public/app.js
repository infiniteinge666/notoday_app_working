fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  // 🔒 VALIDATION (mobile issues)
  if (!file.type.startsWith("image/")) {
    console.warn("Not an image file");
    return;
  }

  const reader = new FileReader();

  reader.onload = async () => {
    setState("idle");

    try {
      const res = await fetch("/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: reader.result })
      });

      // 🔥 HANDLE BAD RESPONSES
      if (!res.ok) {
        console.error("Server error:", res.status);
        setState("idle");
        return;
      }

      const data = await res.json();

      // 🔥 DEFENSIVE CHECK
      if (!data || !data.data) {
        console.error("Invalid response:", data);
        setState("idle");
        return;
      }

      renderResult(data.data);

    } catch (err) {
      console.error("Upload failed:", err);
      setState("idle");
    }
  };

  reader.onerror = () => {
    console.error("File read failed");
  };

  reader.readAsDataURL(file);
});