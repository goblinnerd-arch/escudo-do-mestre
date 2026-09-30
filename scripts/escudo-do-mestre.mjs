const MODULE_ID = "escudo-do-mestre";

class EscudoDoMestreApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "escudo-do-mestre",
      title: "Escudo do Mestre",
      template: `modules/${MODULE_ID}/templates/escudo-do-mestre.hbs`,
      width: 980,
      height: 720,
      resizable: true,
      popOut: true,
      classes: ["escudo-do-mestre-app"]
    });
  }

  getData(options = {}) {
    const data = super.getData(options);
    const characters = game.actors
      .filter(actor => actor.type === "character" && actor.hasPlayerOwner)
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

    data.characters = characters.map(actor => {
      const hp = actor.system?.attributes?.hp ?? {};
      const ac = actor.system?.attributes?.ac?.value ?? "—";
      const perception = actor.system?.skills?.prc?.passive ?? "—";
      const level = actor.system?.details?.level ?? "—";
      const classes = actor.items
        .filter(item => item.type === "class")
        .map(item => item.name)
        .filter(Boolean);

      return {
        id: actor.id,
        uuid: actor.uuid,
        name: actor.name,
        img: actor.img,
        level,
        classes: classes.length ? classes.join(" / ") : "Personagem",
        hp: {
          value: Number.isFinite(Number(hp.value)) ? Number(hp.value) : 0,
          max: Number.isFinite(Number(hp.max)) ? Number(hp.max) : 0,
          temp: Number.isFinite(Number(hp.temp)) ? Number(hp.temp) : 0
        },
        ac,
        perception,
        hpPercent: this._hpPercent(hp.value, hp.max)
      };
    });

    data.characterCount = data.characters.length;
    data.hasCharacters = data.characterCount > 0;
    return data;
  }

  _hpPercent(value, max) {
    const v = Number(value);
    const m = Number(max);
    if (!Number.isFinite(v) || !Number.isFinite(m) || m <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((v / m) * 100)));
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='open-actor']").on("click", event => {
      const actor = game.actors.get(event.currentTarget.dataset.actorId);
      actor?.sheet?.render(true);
    });

    html.find("[data-action='focus-token']").on("click", event => {
      const actorId = event.currentTarget.dataset.actorId;
      const token = canvas.tokens?.placeables?.find(t => t.actor?.id === actorId);
      if (!token) {
        ui.notifications.info("Nenhum token desse personagem está na cena atual.");
        return;
      }
      canvas.animatePan({
        x: token.center.x,
        y: token.center.y,
        scale: canvas.stage.scale.x
      });
      token.control({ releaseOthers: true });
    });
  }
}

let escudoApp = null;

function getEscudoApp() {
  if (!escudoApp) escudoApp = new EscudoDoMestreApp();
  return escudoApp;
}

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Inicializando Escudo do Mestre v0.1.0`);
});

Hooks.once("ready", () => {
  if (game.system.id !== "dnd5e") {
    ui.notifications.warn("Escudo do Mestre foi criado para o sistema D&D5e.");
    return;
  }

  game.escudoDoMestre = {
    open: () => getEscudoApp().render(true),
    close: () => getEscudoApp().close()
  };
});

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user?.isGM) return;

  const tokenControls = controls.find(c => c.name === "token");
  if (!tokenControls) return;

  tokenControls.tools.push({
    name: "escudo-do-mestre",
    title: "Escudo do Mestre",
    icon: "fas fa-shield-halved",
    button: true,
    onClick: () => getEscudoApp().render(true)
  });
});

for (const hook of ["updateActor", "createActor", "deleteActor", "createItem", "updateItem", "deleteItem"]) {
  Hooks.on(hook, document => {
    if (!escudoApp?.rendered) return;

    const actor = document?.documentName === "Actor"
      ? document
      : document?.parent?.documentName === "Actor"
        ? document.parent
        : null;

    if (!actor || actor.type === "character") escudoApp.render(false);
  });
}

Hooks.on("canvasReady", () => {
  if (escudoApp?.rendered) escudoApp.render(false);
});
