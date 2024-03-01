const siteConfigs = {
  "oldReddit": {
    "site": "oldReddit",
    "enabled": oldRedditEnabled,
    "usernameSelector": ".author",
    "detailsPlacement": function(el) { return el.parentNode },
    "detailsStyle": "",
    "linkStyle": "",
    "delay": 1000,
    "interval": 4000
  },
  "newReddit": {
    "site": "newReddit",
    "enabled": newRedditEnabled,
    "usernameSelector": "[data-testid='comment_author_link']",
    "detailsPlacement": function(el) { return el.parentNode.parentNode.parentNode.parentNode },
    "detailsStyle": "font-family: Noto Sans,Arial,sans-serif; font-size:12px; line-height:18px; color:var(--newCommunityTheme-metaText);",
    "linkStyle": "color: var(--newCommunityTheme-linkText);",
    "delay": 1000,
    "interval": 4000
  },
  "kbin": {
    "site": "kbin",
    "enabled": kbinEnabled,
    "usernameSelector": "a.user-inline",
    "detailsPlacement": function(el) { return el.parentNode },
    "detailsStyle": "font-family: Noto Sans,Arial,sans-serif; font-size:12px; line-height:18px;",
    "linkStyle": "",
    "delay": 1000,
    "interval": false
  }
};
// set settings for current site
let config = siteConfigs.newReddit;
let url = window.location.href;
if (url.includes("old.reddit")) {
  config = siteConfigs.oldReddit;
}
if (url.includes("kbin.social")) {
  config = siteConfigs.kbin;
}



if (extensionEnabled && config.enabled) {
  window.onload = run();
}
async function run() {
  if (config.site == "kbin" && kbinEnabled) {
    loadKbinUpgrades();
  }

  if (dootCountEnabled || profilesEnabled) {
    let data = await loadData();
    let doots = data["doots"];
    let profiles = data["profiles"];

    // delay to let comments load
    setTimeout(() => { 
      showDetails(doots, profiles)
    }, config.delay);

    // continously update to include newly loaded comments
    if (config.interval) {
      setInterval(() => {
        showDetails(doots, profiles);
      }, config.interval);
    }
  }

}

// load doot count and profile data
function loadData() {
  let data;

  if (localStorage.getItem("ethfinance-buddy") === null) {
    data = getData();
  } else {
    data = JSON.parse(localStorage.getItem("ethfinance-buddy"));
    if (data["expirationTime"] < Date.now()) {
      data = getData();
    }
  }

  return data; // object
}

// fetch doot count and profile data
async function getData() {
  let data = {};

  let dootsUrl = "https://dailydoots.com/doots.json";
  let profilesUrl = "https://dailydoots.com/profiles.json";
  const [dootsRes, profilesRes] = await Promise.all([
    fetch(dootsUrl),
    fetch(profilesUrl)
  ]);
  doots = await dootsRes.json();
  profiles = await profilesRes.json();
  let currentTime = Date.now(); // epoch in milliseconds
  let expirationTime = currentTime + 3600000; // data expires after an hour

  data["doots"] = doots;
  data["profiles"] = profiles;
  data["expirationTime"] = expirationTime;
  localStorage.setItem("ethfinance-buddy", JSON.stringify(data));

  return data; // object
}

// show user doot count and profiles
function showDetails(doots, profiles) {
  // console.log(document.querySelectorAll(config.usernameSelector).length);
  document.querySelectorAll(config.usernameSelector).forEach(element => {
    if (element.getAttribute('data-eb-details') == "true") {
      // already set, do nothing
    } else {
      element.setAttribute("data-eb-details", "true");
      let username = element.innerText.toLowerCase();
      let detailsPlacement = config.detailsPlacement(element);
      let detailsStyle = config.detailsStyle;
      let separator = `&nbsp;&#xB7;`;
      let dootDetails = "";
      let profileDetails = "";

      if (dootCountEnabled) {
        let dootsObj = doots.filter(entry => entry["username"].toLowerCase() == username);
        let dootCount = dootsObj[0] ? dootsObj[0]["doots"] : "0";
        let heart = `&#x1F90D;`;
        let plural = (dootCount == "1") ? "" : "s";
        dootDetails = (dootCount == "0") ? "" : `${separator} ${heart} ${dootCount} doot${plural}`;
      }

      if (profilesEnabled) {
        let profileObj = profiles.filter(entry => entry["Username"].toLowerCase() == `${username}`);
        let profile = profileObj[0] ? profileObj[0]["Description"] : "";
        // replace the linebreaks with |
        profile = profile.replace(/(?:\r\n|\r|\n)/g, ' | ');
        // convert markdown links to html
        let links = profile.match(/\[.*?\)/g);
        if (links != null && links.length > 0) {
          for (link of links) {
            let linkText = link.match(/\[(.*?)\]/)[1];
            let linkUrl = link.match(/\((.*?)\)/)[1];
            profile = profile.replace(link,
              `<u><a href="${linkUrl}" target="_blank" style="${config.linkStyle}">${linkText}</a></u>`);
          }
        }
        profileDetails = (profile == "") ? "" : `${separator} ${profile}`;
      }

      detailsPlacement.innerHTML += `<span style="${detailsStyle}">${dootDetails}${profileDetails}</span>`;
    }
  });
}




// load kbin features
function loadKbinUpgrades() {
  kbinSortNew();
  kbinCommentTop();
  kbinCollapsibleComments();
  kbinCommentHighlight();
  kbinNewTabLinks();
}

// sort comments by new as default
function kbinSortNew() {
  if (kbinSortNewEnabled) {
    document.querySelector("#options .options__main li a").href += "/hot";
    let url = document.location.href;
    let filterSpecified = url.includes("/hot") || url.includes("/active") || url.includes("/newest") || url.includes("/oldest");
    if (!filterSpecified && url.includes("/m/")) {
      if (url.includes("#")) {
        document.location.href = url.split("#").join("/newest#");
      } else {
        document.location.href += "/newest";
      }
    }
  }
}

// bring the comment box to the top of the comments
function kbinCommentTop() {
  if (kbinCommentTopEnabled) {
    'use strict';
    var container = document.querySelector("#content");
    var comment_form = document.querySelector("#content > div#comment-add");
    var comments_block = document.querySelector("#content > div#comments");

    container.insertBefore(comment_form, comments_block);
  }
}

// make comments collapsible
function kbinCollapsibleComments() {
  if (kbinCollapsibleCommentsEnabled) {
    'use strict';
 
    const COLLAPSE_PARENTS_BY_DEFAULT = false;
 
    const isMobileUser = function () {
        if (navigator.userAgent.match(/Android/i)
            || navigator.userAgent.match(/webOS/i)
            || navigator.userAgent.match(/iPhone/i)
            || navigator.userAgent.match(/iPad/i)
            || navigator.userAgent.match(/iPod/i)
            || navigator.userAgent.match(/BlackBerry/i)
            || navigator.userAgent.match(/Windows Phone/i)) {
            return true;
        } else {
            return false;
        }
    };
 
    const getNumericId = function (comment) {
        return comment.id.split("-").reverse()[0];
    };
 
    const getComment = function (numericId) {
        return document.querySelector('#comments blockquote#entry-comment-' + numericId);
    };
 
    const getChildrenOf = function (numericId) {
        return document.querySelectorAll('#comments blockquote[data-subject-parent-value="' + numericId + '"]');
    }
 
    const getDescendentsOf = function (numericId) {
        var parent = getComment(numericId);
        var children = getChildrenOf(numericId);
 
        var descendents = [];
        children.forEach(function (child) {
            descendents.push(child);
            var childDescendents = getDescendentsOf(getNumericId(child));
            childDescendents.forEach (function (cd) {
                descendents.push(cd);
            });
        });
        return descendents;
    };
 
    const makeCollapseLabel = function (isVisible, childrenCount) {
        var upDown = (isVisible ? '<i class="fa-solid fa-chevron-up"></i>' : '<i class="fa-solid fa-chevron-down"></i>');
        if (!isMobileUser()) {
            var label = (isVisible ? ' hide ' : ' show ')
            return (childrenCount > 0 ?
                    (label + ' [' + childrenCount + '] ' + upDown) :
                    (label + upDown)
                   );
        } else {
            return upDown;
        }
    };
 
    window.toggleChildren = function (numericId) {
        var parent = getComment(numericId);
 
        // get visibility status
        var childrenVisible = (parent.dataset['childrenVisible'] === 'true');
        var toggledStatus = !childrenVisible;
 
        // update dataset
        parent.setAttribute('data-children-visible', toggledStatus);
        if (!COLLAPSE_PARENTS_BY_DEFAULT) {
            var figure = parent.querySelector('figure');
            var footer = parent.querySelector('footer');
            var content = parent.querySelector('.content');
            var more = parent.querySelector('.more');
            if (toggledStatus) {
                content.style.display = '';
                footer.style.display = '';
                figure.style.display = '';
                parent.style.height = '';
                if (more) { more.style.display = ''; }
            } else {
                content.style.display = 'none';
                footer.style.display = 'none';
                figure.style.display = 'none';
                parent.style.height = '43px';
                parent.style.paddingTop = '0.53rem';
                if (more) { more.style.display = 'none'; }
            }
        }
 
        // toggle visibility of the descendents
        var descendents = getDescendentsOf(numericId);
        descendents.forEach(function(c) {
            c.style.display = (toggledStatus ? 'grid' : 'none');
        });
 
        // update the link text
        var childrenCount = parent.dataset['childrenCount'];
        var button = document.querySelector('#comment-'+numericId+'-collapse-button');
        console.debug(button);
        button.innerHTML = makeCollapseLabel(toggledStatus, childrenCount);
    };
 
    const comments = document.querySelectorAll('#comments blockquote.comment');
    comments.forEach(function (comment) {
        var numericId = getNumericId(comment);
        var children = getChildrenOf(numericId);
        var childrenCount = children.length;
        // add some metadata
        comment.setAttribute('data-children-visible', true);
        comment.setAttribute('data-children-count', childrenCount);
 
        var header = comment.querySelector('header');
        header.style.height = '40px';
        header.style.textWrap = 'nowrap';
        header.style.textOverflowX = 'ellipsis';
        header.style.overflowX = 'hidden';
        header.style.display = 'inline-flex';
        var content = comment.querySelector('.content');
        var footer = comment.querySelector('footer');
        var timeAgo = comment.querySelector('.timeago');
        timeAgo.style.overflow = 'hidden';
 
        var elements = [header];
        if (isMobileUser()) {
            elements.push(content);
        }
        var toggleFn = function(ev) {
            ev.stopPropagation();
            window.toggleChildren(numericId);
            return false;
        };
        elements.forEach(function (it) {
            if (it) {
                it.addEventListener('click', toggleFn);
                it.style.cursor = 'pointer';
            }
        });
 
        // Create the collapse/expand button
        var button = document.createElement("a");
        button.id = 'comment-'+numericId+'-collapse-button';
        button.innerHTML = makeCollapseLabel(true, childrenCount);
        button.style.cursor = "pointer";
        button.style.marginLeft = "0.5rem";
        header.appendChild(button);
    });
 
    if (COLLAPSE_PARENTS_BY_DEFAULT) {
        comments.forEach(function (comment) {
            var numericId = getNumericId(comment);
 
            var isTopLevel = (typeof comment.dataset['subject-parent-value'] !== 'string');
            if (isTopLevel) {
                window.toggleChildren(numericId);
            }
        });
    }
  }
}

// opens links in new tabs
function kbinNewTabLinks() {
  if (kbinNewTabLinksEnabled) {
    document.querySelectorAll('.comment .content a').forEach(el => {
      // if (el.href.indexOf('kbin.social') == -1 && el.href.slice(0,1) != '/') {
      // if (el.href.slice(0,1) != '/') {
        el.target = "_blank";
      // }
    });
  }
}

// highlight linked comment
function kbinCommentHighlight() {
  if (kbinCommentHighlightEnabled) {
    'use strict';

    // Get page url
    let url = window.location.href;
    let bgcolor = "";

    // Get theme from body classes
    let theme = document.body.classList[0];

    if (theme == "theme--kbin" || theme == "theme--dark") {
        // Dark green background color
        bgcolor = "#2b4b34";
    } else if (theme == "theme--solarized-dark") {
        bgcolor = "#073642"
    } else {
        // Light green background color
        bgcolor = "#d0e8d6";
    }

    // Get comment anchor id from url
    let comment = url.split("#")[1];

    // Check if comment anchor id exists
    if (comment && comment !="settings") {
        // Get comment element
        let commentElement = document.getElementById(comment);

        // Scroll to comment
        commentElement.scrollIntoView();
        window.scrollBy(0, -50); // Account for header

        // Give comment a background
        commentElement.style.backgroundColor = bgcolor;
    }
  }
}



