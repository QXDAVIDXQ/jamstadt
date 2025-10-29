// ==============================
// JAMSTADT NIGHT TRANSIT – MIT INTERAKTIVER KARTE
// ==============================

// --- HALTESTELLEN MIT KOORDINATEN (basierend auf typischem Netzlayout) ---
const HALTESTELLEN_KARTE = {
  "ZOB 1": { x: 450, y: 300, name: "ZOB 1" },
  "Schloss Vogelberg": { x: 450, y: 220, name: "Schloss Vogelberg" },
  "Neubelle, Rathaus": { x: 450, y: 160, name: "Neubelle, Rathaus" },
  "Einkaufszentrum": { x: 450, y: 100, name: "Einkaufszentrum" },
  "Süßwarenfabrik": { x: 520, y: 100, name: "Süßwarenfabrik" },
  "Wenningbrück, Grundschule": { x: 590, y: 100, name: "Wenningbrück, Grundschule" },
  "Autohaus Kramer": { x: 380, y: 300, name: "Autohaus Kramer" },
  "Meinberg-Gymnasium": { x: 320, y: 300, name: "Meinberg-Gymnasium" },
  "Jamstadt-Orning, Kläranlage": { x: 260, y: 300, name: "Jamstadt-Orning, Kläranlage" },
  "Oberorning, Torstraße": { x: 200, y: 300, name: "Oberorning, Torstraße" },
  "Auring, Bibliothek": { x: 450, y: 380, name: "Auring, Bibliothek" },
  "Hierlingfeldsee": { x: 450, y: 440, name: "Hierlingfeldsee" },
  "Hierlingfeld, Botanischer Garten": { x: 450, y: 500, name: "Hierlingfeld, Botanischer Garten" },
  "Printh, Schrottplatz": { x: 520, y: 500, name: "Printh, Schrottplatz" },
  "Neuhierlingfeld, Legoland": { x: 590, y: 500, name: "Neuhierlingfeld, Legoland" },
  "Auring, Decathlon": { x: 520, y: 300, name: "Auring, Decathlon" },
  "Blönk, Dorfrestaurant": { x: 590, y: 300, name: "Blönk, Dorfrestaurant" },
  "Flusing, Campingbedarf": { x: 660, y: 300, name: "Flusing, Campingbedarf" },
  "Bersdorf, Bürobedarf": { x: 380, y: 360, name: "Bersdorf, Bürobedarf" },
  "Bershofen, Hundertwasserstr.": { x: 320, y: 420, name: "Bershofen, Hundertwasserstr." },
  "Herwald, Musikschule": { x: 260, y: 480, name: "Herwald, Musikschule" },
  "Herwald, Pfarrstadl": { x: 200, y: 540, name: "Herwald, Pfarrstadl" },
  "Google-Hauptsitz": { x: 450, y: 60, name: "Google-Hauptsitz" },
  "In der Schneide": { x: 520, y: 60, name: "In der Schneide" },
  "Hustän, Ludwig-Waschmann-Str.": { x: 380, y: 240, name: "Hustän, Ludwig-Waschmann-Str." },
  "ZOB 2": { x: 520, y: 360, name: "ZOB 2" }
};

// --- LINIEN MIT STOPPS ---
const LINIEN = {
  N1: ["ZOB 1", "Schloss Vogelberg", "Neubelle, Rathaus", "Einkaufszentrum", "Süßwarenfabrik", "Wenningbrück, Grundschule"],
  N2: ["ZOB 1", "Autohaus Kramer", "Meinberg-Gymnasium", "Jamstadt-Orning, Kläranlage", "Oberorning, Torstraße"],
  N3: ["ZOB 1", "Auring, Bibliothek", "Hierlingfeldsee", "Hierlingfeld, Botanischer Garten", "Printh, Schrottplatz", "Neuhierlingfeld, Legoland"],
  N4: ["ZOB 1", "Auring, Decathlon", "Blönk, Dorfrestaurant", "Flusing, Campingbedarf"],
  N5: ["ZOB 1", "Bersdorf, Bürobedarf", "Bershofen, Hundertwasserstr.", "Herwald, Musikschule", "Herwald, Pfarrstadl"],
  NS1: ["ZOB 1", "Google-Hauptsitz", "In der Schneide", "Einkaufszentrum"]
};

// Fahrzeiten zwischen aufeinanderfolgenden Haltestellen (in Minuten)
const FAHRZEITEN = {
  N1: [3, 2, 3, 2, 2],
  N2: [2, 3, 2, 3],
  N3: [3, 2, 2, 3, 3],
  N4: [3, 3, 4],
  N5: [3, 3, 3, 2],
  NS1: [2, 3, 2]
};

// --- PASSAGIER-LOGIK ---
function getPassengerDemand(stopName, isEvent = false) {
  // Normal: 5–15, selten 0 oder bis 30
  // Bei Event: bis 60
  if (isEvent) {
    return Math.min(60, Math.floor(Math.random() * 40) + 20); // 20–60
  }
  const r = Math.random();
  if (r < 0.1) return 0; // 10%: niemand
  if (r < 0.2) return Math.floor(Math.random() * 5); // 0–4
  if (r < 0.9) return 5 + Math.floor(Math.random() * 11); // 5–15
  return 16 + Math.floor(Math.random() * 15); // 16–30
}

// --- SPIELZUSTAND ---
let gameState = null;
let simulationInterval = null;
let canvas = null;
let ctx = null;

// --- INITIALISIERUNG ---
function startNewGame() {
  const numBuses = Math.max(1, Math.min(10, parseInt(document.getElementById('numBuses').value) || 3));
  const numDrivers = Math.max(1, Math.min(10, parseInt(document.getElementById('numDrivers').value) || 3));
  const startMoney = Math.max(1000, parseInt(document.getElementById('startMoney').value) || 2500); // knapp!

  const buses = [];
  for (let i = 1; i <= numBuses; i++) {
    buses.push({
      id: `B${String(i).padStart(3, '0')}`,
      model: i <= 2 ? "Elektro" : "Standard",
      capacity: i <= 2 ? 25 : 30,
      status: "frei",
      position: "ZOB 1", // aktuelle Haltestelle
      target: null, // Ziel-Haltestelle
      progress: 0, // 0.0 – 1.0 (Fortschritt zwischen zwei Haltestellen)
      assignedLine: null,
      routeIndex: 0 // nächster Stopp in der Linie
    });
  }

  const driverNames = ["Anna Müller", "Bernd Schmidt", "Clara Weber", "David Koch", "Elena Fischer", "Felix Bauer", "Greta Hoffmann", "Hans Klein", "Ingrid Wolf", "Jonas Schmitt"];
  const drivers = [];
  for (let i = 0; i < numDrivers; i++) {
    drivers.push({
      id: `D${String(i+1).padStart(3, '0')}`,
      name: driverNames[i] || `Fahrer ${i+1}`,
      status: "frei",
      assignedBus: null,
      hoursWorked: 0,
      maxHours: 6
    });
  }

  // Wartende Passagiere pro Haltestelle
  const waitingPassengers = {};
  Object.keys(HALTESTELLEN_KARTE).forEach(stop => {
    waitingPassengers[stop] = 0;
  });

  gameState = {
    night: 1,
    money: startMoney,
    currentTime: 23 * 60,
    endTime: (24 + 5) * 60,
    buses,
    drivers,
    waitingPassengers,
    activeAssignments: [], // { busId, driverId, lineId, startTime }
    currentEvent: null,
    log: []
  };

  // Canvas initialisieren
  canvas = document.getElementById('mapCanvas');
  ctx = canvas.getContext('2d');

  document.getElementById('setupScreen').classList.remove('visible');
  document.getElementById('gameScreen').classList.add('visible');
  document.getElementById('mapNight').textContent = gameState.night;

  updateUI();
  drawMap();
  addToLog(`✅ Spiel gestartet! Startkapital: ${startMoney} € – Plane sorgfältig!`);
}

// --- KARTE ZEICHNEN ---
function drawMap() {
  if (!ctx || !gameState) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Linien zeichnen
  Object.entries(LINIEN).forEach(([lineId, stops]) => {
    ctx.strokeStyle = lineId === "N1" ? "#ef4444" :
                     lineId === "N2" ? "#10b981" :
                     lineId === "N3" ? "#3b82f6" :
                     lineId === "N4" ? "#f59e0b" :
                     lineId === "N5" ? "#8b5cf6" : "#f97316";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < stops.length; i++) {
      const stop = HALTESTELLEN_KARTE[stops[i]];
      if (stop) {
        if (i === 0) {
          ctx.moveTo(stop.x, stop.y);
        } else {
          ctx.lineTo(stop.x, stop.y);
        }
      }
    }
    ctx.stroke();
  });

  // Haltestellen
  Object.entries(HALTESTELLEN_KARTE).forEach(([name, pos]) => {
    const waiting = gameState.waitingPassengers[name] || 0;
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(waiting > 0 ? waiting.toString() : "", pos.x, pos.y + 4);
  });

  // Busse
  gameState.buses.forEach(bus => {
    const currentStop = HALTESTELLEN_KARTE[bus.position];
    if (!currentStop) return;

    let x = currentStop.x, y = currentStop.y;

    if (bus.target) {
      const targetStop = HALTESTELLEN_KARTE[bus.target];
      if (targetStop) {
        x = currentStop.x + (targetStop.x - currentStop.x) * bus.progress;
        y = currentStop.y + (targetStop.y - currentStop.y) * bus.progress;
      }
    }

    ctx.fillStyle = bus.status === "frei" ? "#10b981" : "#ef4444";
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(bus.id, x, y + 4);
  });
}

// --- SIMULATION ---
function startSimulation() {
  if (simulationInterval) return;

  // Ereignis
  const events = [
    { type: "party", msg: "🎉 Party im Einkaufszentrum! Viele Passagiere!", stops: ["Einkaufszentrum", "Google-Hauptsitz", "In der Schneide"] },
    { type: "regen", msg: "🌧️ Regen! Mehr Passagiere überall!", stops: Object.keys(HALTESTELLEN_KARTE) }
  ];
  gameState.currentEvent = Math.random() < 0.5 ? events[Math.floor(Math.random() * events.length)] : null;

  if (gameState.currentEvent) {
    addToLog("❗ " + gameState.currentEvent.msg);
    document.getElementById('eventBanner').textContent = gameState.currentEvent.msg;
    document.getElementById('eventBanner').classList.add('show');
  } else {
    document.getElementById('eventBanner').classList.remove('show');
  }

  simulationInterval = setInterval(() => {
    if (!gameState) return;
    gameState.currentTime++;

    // Neue Passagiere generieren (alle 10 Minuten)
    if (gameState.currentTime % 10 === 0) {
      Object.keys(gameState.waitingPassengers).forEach(stop => {
        const isEventStop = gameState.currentEvent?.stops?.includes(stop);
        const newPassengers = getPassengerDemand(stop, isEventStop);
        gameState.waitingPassengers[stop] += newPassengers;
        // Maximal 100 Wartende (realistisch)
        if (gameState.waitingPassengers[stop] > 100) gameState.waitingPassengers[stop] = 100;
      });
    }

    // Busse bewegen
    gameState.buses.forEach(bus => {
      if (bus.status === "im Einsatz" && bus.assignedLine) {
        const line = LINIEN[bus.assignedLine];
        const times = FAHRZEITEN[bus.assignedLine];

        if (bus.progress >= 1.0) {
          // Ankunft an nächster Haltestelle
          bus.position = line[bus.routeIndex];
          bus.routeIndex++;

          if (bus.routeIndex < line.length) {
            // Weiter zur nächsten Haltestelle
            bus.target = line[bus.routeIndex];
            bus.progress = 0;
          } else {
            // Linie beendet
            const driver = gameState.drivers.find(d => d.assignedBus === bus.id);
            if (driver) {
              driver.status = "frei";
              driver.assignedBus = null;
            }
            bus.status = "frei";
            bus.assignedLine = null;
            bus.target = null;
            bus.routeIndex = 0;
            addToLog(`🚌 ${bus.id} hat Linie beendet.`);
          }
        } else {
          // Bewegung fortsetzen
          const totalTime = times[bus.routeIndex - 1] * 60; // in Sekunden für Smoothness
          const step = 1 / totalTime;
          bus.progress += step;
        }
      }
    });

    updateUI();
    drawMap();

    // Nacht beenden?
    if (gameState.currentTime >= gameState.endTime) {
      clearInterval(simulationInterval);
      simulationInterval = null;
      gameState.night++;
      document.getElementById('mapNight').textContent = gameState.night;
      addToLog(`✅ Nacht beendet! Kontostand: ${gameState.money.toFixed(2)} €`);
    }
  }, 500); // halbe Sekunde pro Spiel-Minute
}

// --- ZUWEISUNG ---
function assignTrip(busId, driverId, lineId) {
  const bus = gameState.buses.find(b => b.id === busId);
  const driver = gameState.drivers.find(d => d.id === driverId);
  if (!bus || !driver || bus.status !== "frei" || driver.status !== "frei") return false;

  const line = LINIEN[lineId];
  if (!line) return false;

  const tripTime = FAHRZEITEN[lineId].reduce((a, b) => a + b, 0);
  const newHours = driver.hoursWorked + (tripTime / 60);
  if (newHours > driver.maxHours) {
    alert("Fahrer würde Überstunden machen!");
    return false;
  }

  // Bus zur Start-Haltestelle bringen (wenn nicht am ZOB)
  const startStop = line[0];
  if (bus.position !== startStop) {
    // Leerfahrt einplanen (vereinfacht: Bus springt, aber Zeit vergeht)
    addToLog(`🚛 ${bus.id} fährt leer von ${bus.position} nach ${startStop} (${getTimeBetween(bus.position, startStop)} Min).`);
    // In echter Version: Bus würde sich bewegen – hier vereinfacht
  }

  // Starte Linie
  bus.status = "im Einsatz";
  bus.assignedLine = lineId;
  bus.position = startStop;
  bus.target = line[1];
  bus.progress = 0;
  bus.routeIndex = 1;

  driver.status = "im Einsatz";
  driver.assignedBus = busId;
  driver.hoursWorked = newHours;

  addToLog(`✅ ${driver.name} mit ${bus.id} auf ${lineId} gestartet.`);
  return true;
}

// --- HILFSFUNKTIONEN ---
function getTimeBetween(from, to) {
  // Vereinfacht: alle Haltestellen sind ca. 2–4 Min voneinander entfernt
  return 3;
}

function addToLog(msg) {
  if (!gameState) return;
  const timeStr = formatTime(gameState.currentTime);
  const entry = `[${timeStr}] ${msg}`;
  gameState.log.push(entry);
  const el = document.getElementById('gameLog');
  el.textContent = gameState.log.join('\n');
  el.scrollTop = el.scrollHeight;
}

function formatTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function updateUI() {
  if (!gameState) return;
  document.getElementById('moneyDisplay').textContent = `💰 ${gameState.money.toLocaleString('de-DE')} €`;
  document.getElementById('nightDisplay').textContent = `🌙 Nacht ${gameState.night}`;
  document.getElementById('timeDisplay').textContent = `🕒 ${formatTime(gameState.currentTime)}`;
}

// --- RESTLICHE FUNKTIONEN (Speichern, Laden, UI-Dialoge) ---
// (Der Platz reicht nicht für alles, aber das Wichtigste ist drin)

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startGameBtn').addEventListener('click', startNewGame);
  document.getElementById('endNightBtn').addEventListener('click', startSimulation);
});
