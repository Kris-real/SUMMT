module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");

  const send = (status, content) => {
    const message =
      "authorization:github:" + status + ":" + JSON.stringify(content);

    const safeJSON = (value) =>
      JSON.stringify(value).replace(/</g, "\\u003c");

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    return res.status(200).send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>GitHub login</title>
</head>
<body>
<p id="status">Finishing GitHub login...</p>
<script>
(function () {
  var message = ${safeJSON(message)};
  var errorMessage = ${safeJSON(
    status === "error" ? content.message || "Login failed." : ""
  )};
  var label = document.getElementById("status");
  var parent = window.opener;
  var origin = window.location.origin;

  if (!parent || parent.closed) {
    label.textContent =
      "Cannot reach the admin tab. Close this popup and start login " +
      "again from the admin page.";
    return;
  }

  var finished = false;
  var interval;
  var timeout;

  function receive(event) {
    if (event.source !== parent || event.origin !== origin) return;
    if (finished) return;
    finished = true;

    clearInterval(interval);
    clearTimeout(timeout);
    window.removeEventListener("message", receive);

    parent.postMessage(message, origin);

    if (errorMessage) {
      label.textContent = "Login failed: " + errorMessage;
    } else {
      label.textContent = "Login sent to admin. You can close this window.";
      setTimeout(function () { window.close(); }, 500);
    }
  }

  function announce() {
    parent.postMessage("authorizing:github", origin);
  }

  window.addEventListener("message", receive);

  interval = setInterval(announce, 1000);
  timeout = setTimeout(function () {
    clearInterval(interval);
    window.removeEventListener("message", receive);
    label.textContent = errorMessage
      ? "Login failed: " + errorMessage
      : "The admin tab did not reply. Check that the admin page and " +
        "callback use the exact same domain, including www.";
  }, 15000);

  announce();
})();
</script>
</body>
</html>`);
  };

  try {
    const { code, state, error } = req.query || {};

    if (error) {
      return send("error", { message: "GitHub authorization was declined." });
    }

    const cookie = (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("oauth_state="));

    const saved = cookie
      ? decodeURIComponent(cookie.slice("oauth_state=".length))
      : "";

    if (
      typeof code !== "string" ||
      typeof state !== "string" ||
      !saved ||
      state !== saved
    ) {
      return send("error", {
        message: "Login check failed. Close this popup and try again."
      });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return send("error", {
        message: "GitHub environment variables are missing in Vercel."
      });
    }

    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.error || !data.access_token) {
      return send("error", {
        message:
          data.error_description ||
          data.error ||
          "GitHub did not return an access token."
      });
    }

    return send("success", {
      token: data.access_token,
      provider: "github"
    });
  } catch (error) {
    console.error("OAuth callback failed:", error.name);

    return send("error", {
      message: "The callback failed. Check the Vercel runtime logs."
    });
  }
};


