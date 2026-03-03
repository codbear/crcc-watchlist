const STREAMERS = [
  "aelsan__",
  "aleknms",
  "angylith",
  "flo_nino",
  "guygui_onlive",
  "iranonlecoeurerrant",
  "kahnell_",
  "kalas68110",
  "kennyvrogne",
  "les_mondes_de_mino",
  "mrgrusd",
  "mrmuscle___",
  "norefur",
  "ori_illu",
  "pierredesprojeet",
  "the_coding_bear",
];

const liveListElement = document.getElementById("live-list");
const offlineListElement = document.getElementById("offline-list");
const liveEmptyElement = document.getElementById("live-empty");
const offlineEmptyElement = document.getElementById("offline-empty");
const statusElement = document.getElementById("status");
const refreshButton = document.getElementById("refresh-btn");
const AUTO_REFRESH_INTERVAL_MS = 60000;

function formatViewerCount(viewerCount) {
  return new Intl.NumberFormat("fr-FR").format(viewerCount);
}

function renderLiveCard(channel) {
  const cardLink = document.createElement("a");
  cardLink.className = "card";
  cardLink.dataset.login = channel.login.toLowerCase();
  cardLink.href = `https://www.twitch.tv/${channel.login}`;
  cardLink.target = "_blank";
  cardLink.rel = "noreferrer noopener";

  const thumbnail = document.createElement("img");
  thumbnail.src = channel.thumbnailUrl;
  thumbnail.alt = `Aperçu du stream de ${channel.displayName}`;

  const content = document.createElement("div");
  content.className = "card-content";

  const title = document.createElement("h3");
  title.textContent = channel.displayName;

  const streamTitle = document.createElement("p");
  streamTitle.className = "meta";
  streamTitle.textContent = channel.title || "Sans titre";

  const game = document.createElement("p");
  game.className = "meta";
  game.innerHTML = `<b>Catégorie:</b> ${channel.gameName || "Non précisé"}`;

  const viewers = document.createElement("p");
  viewers.className = "meta";
  viewers.innerHTML = `<b>Spectateurs:</b> ${formatViewerCount(channel.viewerCount)}`;

  content.append(title, streamTitle, game, viewers);
  cardLink.append(thumbnail, content);
  return cardLink;
}

function renderOfflineItem(channel) {
    
    console.log(channel);
  const item = document.createElement("li");
  item.dataset.login = channel.login.toLowerCase();
  if (!channel.exists) {
    item.textContent = `${channel.login} — pseudo introuvable`;
    return item;
  }

  const avatar = document.createElement("img");
  avatar.src = channel.profileImageUrl;
  avatar.alt = `Avatar de ${channel.displayName}`;
  avatar.className = "avatar";

  const link = document.createElement("a");
  link.href = `https://www.twitch.tv/${channel.login}`;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.innerHTML = channel.displayName;

  item.append(avatar, link);
  return item;
}

function reconcileSection(container, channels, renderItem) {
  const existingByLogin = new Map();
  for (const element of container.children) {
    if (element.dataset.login) {
      existingByLogin.set(element.dataset.login, element);
    }
  }

  for (const channel of channels) {
    const loginKey = channel.login.toLowerCase();
    const currentElement = existingByLogin.get(loginKey);
    let elementToInsert = currentElement;
    const nextElement = renderItem(channel);

    if (!currentElement) {
      elementToInsert = nextElement;
    } else if (currentElement.outerHTML !== nextElement.outerHTML) {
      currentElement.replaceWith(nextElement);
      elementToInsert = nextElement;
    }

    container.append(elementToInsert);
    existingByLogin.delete(loginKey);
  }

  for (const staleElement of existingByLogin.values()) {
    staleElement.remove();
  }
}

async function loadStreams() {
  try {
    refreshButton.disabled = true;
    statusElement.textContent = "Chargement des statuts Twitch...";

    const channelsParam = encodeURIComponent(STREAMERS.join(","));
    const response = await fetch(`/api/streams?channels=${channelsParam}`);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Erreur inconnue");
    }

    const payload = await response.json();
    const channels = payload.channels || [];

    const liveChannels = channels.filter((channel) => channel.isLive);
    const offlineChannels = channels.filter((channel) => !channel.isLive);

    reconcileSection(liveListElement, liveChannels, renderLiveCard);
    reconcileSection(offlineListElement, offlineChannels, renderOfflineItem);

    liveEmptyElement.style.display = liveChannels.length ? "none" : "block";
    offlineEmptyElement.style.display = offlineChannels.length ? "none" : "block";

    statusElement.textContent = `Mis à jour à ${new Date().toLocaleTimeString("fr-FR")}.`;
  } catch (error) {
    statusElement.textContent = `Erreur: ${error.message}`;
    liveEmptyElement.style.display = "block";
    offlineEmptyElement.style.display = "block";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadStreams);
loadStreams();
setInterval(loadStreams, AUTO_REFRESH_INTERVAL_MS);
