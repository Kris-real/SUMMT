  const send = (status, content) => {
    const msg =
      "authorization:github:" + status + ":" + JSON.stringify(content);

    const safeMessage = JSON.stringify(msg).replace(/</g, "\\u003c");
    const safeStatus = JSON.stringify(status);
    const safeError = JSON.stringify(
      status === "error"
        ? content.message || "GitHub login failed."
        : ""
    ).replace(/</g, "\\u003c");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");

    return res.status(200).send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>GitHub login</title></head>
<body>
<p id="status">Finishing GitHub login...</p>
<script>
(function () {
  var message = ${safeMessage};
  var status = ${safeStatus};
  var error = ${safeError};
  var label = document.getElementById("status");
  var opener = window.opener;

  // This assumes the CMS and callback use the same domain.
  var cmsOrigin = window.location.origin;

  if (!opener || opener.closed) {
    label.textContent =
      "Cannot communicate with the admin tab. Close this popup and " +
      "start Login with GitHub again from your admin page. " +
      "If this repeats, check Cross-Origin-Opener-Policy headers.";
    return;
  }

  var finished = false;
  var timer;
  var timeout;

  function receive(event) {
    if (event.source !== opener || event.origin !== cmsOrigin) return;
    if (finished) return;
    finished = true;

    clearInterval(timer);
    clearTimeout(timeout);
    window.removeEventListener("message", receive);

    opener.postMessage(message, cmsOrigin);
    label.textContent =
      status === "success"
        ? "Login sent to the admin tab. You can close this popup."
        : "Login failed: " + error;

    if (status === "success") {
      setTimeout(function () { window.close(); }, 500);
    }
  }

  function announce() {
    opener.postMessage("authorizing:github", cmsOrigin);
  }

  window.addEventListener("message", receive);

  timer = setInterval(announce, 1000);
  timeout = setTimeout(function () {
    clearInterval(timer);
    window.removeEventListener("message", receive);
    label.textContent =
      status === "error"
        ? "Login failed: " + error
        : "GitHub returned a token, but the admin tab did not reply. " +
          "Check that the admin page and callback use exactly the same " +
          "domain, then check the browser console for script or header errors.";
  }, 15000);

  announce();
})();
</script>
</body>
</html>`);
  };
