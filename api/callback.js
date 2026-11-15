// Step 2: GitHub sends you back here; we swap the code for a token and hand it to the admin page.
module.exports = async (req, res) => {
  const { code, state } = req.query || {};
  const cookie = (req.headers.cookie || "").split(";").map(s => s.trim()).find(s => s.startsWith("oauth_state="));
  const saved = cookie ? cookie.split("=")[1] : "";
  const send = (status, content) => {
    const msg = status === "success" ? "authorization:github:success:" + JSON.stringify(content)
                                      : "authorization:github:error:" + JSON.stringify(content);
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`<!doctype html><meta charset="utf-8"><body><script>
(function(){
  var m=${JSON.stringify(msg)};
  function r(e){window.opener.postMessage(m,e.origin);window.removeEventListener("message",r,false);window.close();}
  window.addEventListener("message",r,false);
  window.opener.postMessage("authorizing:github","*");
})();
</script>Signing in...</body>`);
  };
  if (!code || !state || state !== saved) return send("error", { message: "Login check failed. Close this window and try again." });
  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code })
    });
    const d = await r.json();
    if (d.error || !d.access_token) return send("error", { message: d.error_description || d.error || "No token returned." });
    send("success", { token: d.access_token, provider: "github" });
  } catch (e) { send("error", { message: "Could not reach GitHub." }); }
};
