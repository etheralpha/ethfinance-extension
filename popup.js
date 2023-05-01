// Listen for the extension toggle button click
const toggleBtn = document.getElementById("toggleBtn");
toggleBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: toggle,
  });
});


async function toggle() {
  const settings = {
    "oldReddit": {
      "usernameSelector": ".author",
      "detailsPlacement": function(el) { return el.parentNode },
      "detailsStyle": "",
      "linkStyle": ""
    },
    "newReddit": {
      "usernameSelector": "[data-testid='comment_author_link']",
      "detailsPlacement": function(el) { return el.parentNode.parentNode.parentNode.parentNode },
      "detailsStyle": "font-family: Noto Sans,Arial,sans-serif; font-size:12px; line-height:18px; color:var(--newCommunityTheme-metaText);",
      "linkStyle": "color: var(--newCommunityTheme-linkText);"
    }
  };


  // Load json
  let doots;
  let dootsUrl = "https://dailydoots.com/doots.json";
  let profilesUrl = "https://dailydoots.com/profiles.json";
  const [dootsRes, profilesRes] = await Promise.all([
    fetch(dootsUrl),
    fetch(profilesUrl)
  ]);
  doots = await dootsRes.json();
  profiles = await profilesRes.json();


  // show details
  if (document.body.getAttribute('data-ethfinance-buddy') === "enabled") {
    // already enabled, do nothing
  } else {
    let userSettings = settings.newReddit;
    let url = window.location.href;
    if (url.includes("old.reddit")) {
      userSettings = settings.oldReddit;
    }

    document.querySelectorAll(userSettings.usernameSelector).forEach(element => {
      let username = element.innerText.toLowerCase();
      let dootskey = `[${username}](https://reddit.com/u/${username})`;
      let dootsObj = doots.filter(entry => entry["Username"].toLowerCase() == `${dootskey}`);
      let dootCount = dootsObj[0] ? dootsObj[0]["Daily Doots"] : "0";

      let profileObj = profiles.filter(entry => entry["Username"].toLowerCase() == `${username}`);
      let profile = profileObj[0] ? profileObj[0]["Description"] : "";
      // replace the linebreaks with <br>
      profile = profile.replace(/(?:\r\n|\r|\n)/g, '<br>');
      // convert markdown links to html
      let links = profile.match(/\[.*?\)/g);
      if (links != null && links.length > 0) {
        for (link of links) {
          let linkText = link.match(/\[(.*?)\]/)[1];
          let linkUrl = link.match(/\((.*?)\)/)[1];
          profile = profile.replace(link,
            `<a href="${linkUrl}" target="_blank" style="${userSettings.linkStyle}">${linkText}</a>`);
        }
      }

      let placement = userSettings.detailsPlacement(element);
      let styling = userSettings.detailsStyle;
      let profileHtml = (profile == "") ? "" : `&#xB7; ${profile}`;
      let heart = (dootCount == "0") ? "&#x1F90D;" : "&#x1F499;";
      let plural = (dootCount == "1") ? "" : "s";
      placement.innerHTML += `<span style="${styling}">&nbsp;&#xB7; ${heart} ${dootCount} Daily Doot${plural} ${profileHtml}</span>`;
    });
    document.body.setAttribute("data-ethfinance-buddy", "enabled");
  }
}
