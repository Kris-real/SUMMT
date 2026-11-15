// Step 1 of the admin login on Vercel: sends you to GitHub to sign in.
module.exports = (req, res) => {
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id) { res.status(500).send("GITHUB_CLIENT_ID is not set in Vercel."); return; }
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  res.setHeader("Set-Cookie", `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  const url = "https://github.com/login/oauth/authorize?client_id=" + encodeURIComponent(id) +
    "&scope=" + encodeURIComponent("repo,user") + "&state=" + state;
  res.redirect(302, url);
};
