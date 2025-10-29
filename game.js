// ==============================
// JAMSTADT NIGHT TRANSIT – FINAL VERSION
// ==============================

// --- HALTESTELLEN MIT KOORDINATEN ---
const HALTESTELLEN_KARTE = {
  "ZOB 1": { x: 450, y: 300 },
  "Schloss Vogelberg": { x: 450, y: 220 },
  "Neubelle, Rathaus": { x: 450, y: 160 },
  "Einkaufszentrum": { x: 450, y: 100 },
  "Süßwarenfabrik": { x: 520, y: 100 },
  "Wenningbrück, Grundschule": { x: 590, y: 100 },
  "Autohaus Kramer": { x: 380, y: 300 },
  "Meinberg-Gymnasium": { x: 320, y: 300 },
  "Jamstadt-Orning, Kläranlage": { x: 260, y: 300 },
  "Oberorning, Torstraße": { x: 200, y: 300 },
  "Auring, Bibliothek": { x: 450, y: 380 },
  "Hierlingfeldsee": { x: 450, y: 440 },
  "Hierlingfeld, Botanischer Garten": { x: 450, y: 500 },
  "Printh, Schrottplatz": { x: 520, y: 500 },
  "Neuhierlingfeld, Legoland": { x: 590, y: 500 },
  "Auring, Decathlon": { x: 520, y: 300 },
  "Blönk, Dorfrestaurant": { x: 590, y: 300 },
  "Flusing, Campingbedarf": { x: 660, y: 300 },
  "Bersdorf, Bürobedarf": { x: 380, y: 360 },
  "Bershofen, Hundertwasserstr.": { x: 320, y: 420 },
  "Herwald, Musikschule": { x: 260, y: 480 },
  "Herwald, Pfarrstadl": { x: 200, y: 540 },
  "Google-Hauptsitz": { x: 450, y: 60 },
  "In der Schneide": { x: 520, y: 60 },
  "Hustän, Ludwig-Waschmann-Str.": { x: 380, y: 240 },
  "ZOB 2": { x: 520, y: 360 }
};

// --- LINIEN ---
const LINIEN = {
  N1: ["ZOB 1", "Schloss Vogelberg", "Neubelle, Rathaus", "Einkaufszentrum", "Süßwarenfabrik", "Wenningbrück, Grundschule"],
  N2: ["ZOB 1", "Autohaus Kramer", "Meinberg-Gymnasium", "Jamstadt-Orning, Kläranlage", "Oberorning, Torstraße"],
  N3: ["ZOB 1", "Auring, Bibliothek", "Hierlingfeldsee", "Hierlingfeld, Botanischer Garten", "Printh, Schrottplatz", "Neuhierlingfeld, Legoland"],
  N4: ["ZOB 1", "Auring, Decathlon", "Blönk, Dorfrestaurant", "Flusing, Campingbedarf"],
  N5: ["ZOB 1", "Bersdorf, Bürobedarf", "Bershofen, Hundertwasserstr.", "Herwald, Musikschule", "Herwald, Pfarrstadl"],
  NS1: ["ZOB 1", "Google-Hauptsitz", "In der Schneide", "Einkaufszentrum"]
};

const FAHRZEITEN = {
  N1: [3, 2, 3, 2, 2],
  N2: [2, 3, 2, 3],
  N3: [3, 2, 2, 3, 3],
  N4: [3, 3, 4],
  N5: [3, 3, 3, 2],
  NS1: [2, 3, 2]
};

// --- PASSAGIER-GENERATOR (REALISTISCH) ---
function getPassengerDemand(stopName, isEvent = false) {
  // Normale Haltestellen: meist 5–15, selten 0–30
  // Event-Haltestellen (z.B. Einkaufszentrum bei Party): bis 40, aber realistisch
  
  const eventStops = ["Einkaufszentrum", "Google-Hauptsitz", "Neuhierlingfeld, Legoland"];
  const isEventStop = isEvent && eventStops.includes(stopName);

  if (isEventStop) {
    // Bei Event: 10–40, selten bis 50
    return Math.min(50, Math.floor(Math.random() * 31) + 10);
  } else {
    // Normal: 90% zwischen 5–15
    const r = Math.random();
    if (r < 0.05) return 0; // 5%: niemand
    if (r < 0.15) return Math.floor(Math.random() * 5); // 0–4
    if (r < 0.95) return 5 + Math.floor(Math.random() * 11); // 5–15
    return 16 + Math.floor(Math.random() * 10); // 16–25 (selten)
  }
}

// --- SPIELZUSTAND ---
let gameState = null;
let simulationInterval = null;
let canvas = null;
let ctx = null;
let simulationSpeed = 90; // 90 Spielminuten pro echte Sekunde → 6h = 240s = 4 Min

// --- INITIALISIERUNG ---
function startNewGame() {
  const numBuses = Math.max(1, Math.min(10, parseInt(document.getElementById('numBuses').value) || 3));
  const numDrivers = Math.max(1, Math.min(10, parseInt(document.getElementById('numDrivers').value) || 3));
  const startMoney = Math.max(1000, parseInt(document.getElementById('startMoney').value) || 2500);

  const buses = [];
  for (let i = 1; i <= numBuses; i++) {
    buses.push({
      id: `B${String(i).padStart(3, '0')}`,
      model: i <= 2 ? "Elektro" : "Standard",
      capacity: i <= 2 ? 25 : 30,
      status: "frei",
      position: "ZOB 1",
      target: null,
      progress: 0,
      assignedLine: null,
      routeIndex: 0
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

  const waitingPassengers = {};
  Object.keys(HALTESTELLEN_KARTE).forEach(stop => {
    waitingPassengers[stop] = 0;
  });

  gameState = {
    night: 1,
    money: startMoney,
    currentTime: 23 * 60, // 23:00
    endTime: (24 + 5) * 60, // 05:00
    buses,
    drivers,
    waitingPassengers,
    currentEvent: null,
    log: []
  };

  canvas = document.getElementById('mapCanvas');
  ctx = canvas.getContext('2d');

  document.getElementById('setupScreen').classList.remove('visible');
  document.getElementById('gameScreen').classList.add('visible');
  document.getElementById('mapNight').textContent = gameState.night;

  updateUI();
  drawMap();
  addToLog(`✅ Spiel gestartet! Startkapital: ${startMoney} €`);
  addToLog("🕗 Klicke auf 'Nacht starten', um die 4-Minuten-Simulation zu beginnen.");
}

// --- KARTE ZEICHNEN ---
function drawMap() {
  if (!ctx || !gameState) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Linien
  const colors = { N1: "#ef4444", N2: "#10b981", N3: "#3b82f6", N4: "#f59e0b", N5: "#8b5cf6", NS1: "#f97316" };
  Object.entries(LINIEN).forEach(([lineId, stops]) => {
    ctx.strokeStyle = colors[lineId];
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < stops.length; i++) {
      const pos = HALTESTELLEN_KARTE[stops[i]];
      if (pos) {
        if (i === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
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
    if (waiting > 0) {
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(waiting.toString(), pos.x, pos.y + 4);
    }
  });

  // Busse
  gameState.buses.forEach(bus => {
    const currentPos = HALTESTELLEN_KARTE[bus.position];
    if (!currentPos) return;

    let x = currentPos.x, y = currentPos.y;
    if (bus.target) {
      const targetPos = HALTESTELLEN_KARTE[bus.target];
      if (targetPos) {
        x = currentPos.x + (targetPos.x - currentPos.x) * bus.progress;
        y = currentPos.y + (targetPos.y - currentPos.y) * bus.progress;
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

// --- SIMULATION (4 MINUTEN ECHTZEIT) ---
function toggleSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    addToLog("⏸️ Simulation pausiert.");
  } else {
    // Ereignis für diese Nacht
    const events = [
      { type: "party", msg: "🎉 Party im Einkaufszentrum! Mehr Passagiere!", active: true },
      { type: "regen", msg: "🌧️ Regen! Leicht erhöhte Nachfrage.", active: true }
    ];
    gameState.currentEvent = Math.random() < 0.4 ? events[Math.floor(Math.random() * events.length)] : null;

    if (gameState.currentEvent) {
      addToLog("❗ " + gameState.currentEvent.msg);
      document.getElementById('eventBanner').textContent = gameState.currentEvent.msg;
      document.getElementById('eventBanner').classList.add('show');
    } else {
      document.getElementById('eventBanner').classList.remove('show');
    }

    simulationInterval = setInterval(() => {
      if (!gameState) return;

      // Spielzeit vorantreiben
      gameState.currentTime += simulationSpeed / 60; // z.B. 90/60 = 1.5 Min pro echter Sekunde

      // Alle 5 Spielminuten: neue Passagiere
      if (Math.floor(gameState.currentTime) % 5 === 0 && gameState.currentTime % 5 < simulationSpeed / 3600) {
        Object.keys(gameState.waitingPassengers).forEach(stop => {
          const isEvent = gameState.currentEvent && 
            (gameState.currentEvent.type === "regen" || 
             (gameState.currentEvent.type === "party" && ["Einkaufszentrum", "Google-Hauptsitz", "In der Schneide"].includes(stop)));
          const newP = getPassengerDemand(stop, isEvent);
          gameState.waitingPassengers[stop] += newP;
          if (gameState.waitingPassengers[stop] > 100) gameState.waitingPassengers[stop] = 100;
        });
      }

      // Busse bewegen
      gameState.buses.forEach(bus => {
        if (bus.status === "im Einsatz" && bus.assignedLine) {
          const line = LINIEN[bus.assignedLine];
          const times = FAHRZEITEN[bus.assignedLine];

          if (bus.progress >= 1.0) {
            // Ankunft
            bus.position = line[bus.routeIndex];
            // Passagiere aufnehmen (max Bus-Kapazität)
            const waiting = gameState.waitingPassengers[bus.position] || 0;
            const boarded = Math.min(waiting, bus.capacity);
            gameState.waitingPassengers[bus.position] -= boarded;
            if (gameState.waitingPassengers[bus.position] < 0) gameState.waitingPassengers[bus.position] = 0;

            // Einnahmen
            const revenue = boarded * 1.0;
            gameState.money += revenue;

            bus.routeIndex++;
            if (bus.routeIndex < line.length) {
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
              addToLog(`🚌 ${bus.id} hat Linie beendet. ${boarded} Passagiere befördert.`);
            }
          } else {
            // Bewegung
            const segmentTime = times[bus.routeIndex - 1];
            const progressStep = (simulationSpeed / 60) / segmentTime;
            bus.progress += progressStep;
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
        addToLog(`✅ Nacht ${gameState.night - 1} beendet! Kontostand: ${gameState.money.toFixed(2)} €`);
      }
    }, 1000); // jede echte Sekunde
  }
}

// --- ZUWEISUNG ---
function openAssignmentDialog() {
  const freeBuses = gameState.buses.filter(b => b.status === "frei");
  const freeDrivers = gameState.drivers.filter(d => d.status === "frei" && d.hoursWorked < d.maxHours);

  if (freeBuses.length === 0 || freeDrivers.length === 0) {
    alert("Kein freier Bus oder Fahrer verfügbar!");
    return;
  }

  const busSel = document.getElementById('assignBus');
  busSel.innerHTML = '';
  freeBuses.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.id} (${b.model}, ${b.capacity} Plätze)`;
    busSel.appendChild(opt);
  });

  const driverSel = document.getElementById('assignDriver');
  driverSel.innerHTML = '';
  freeDrivers.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.name} (${d.hoursWorked.toFixed(1)}/6 Std)`;
    driverSel.appendChild(opt);
  });

  document.getElementById('assignmentDialog').style.display = 'block';
}

function closeAssignmentDialog() {
  document.getElementById('assignmentDialog').style.display = 'none';
}

function confirmAssignment() {
  const busId = document.getElementById('assignBus').value;
  const driverId = document.getElementById('assignDriver').value;
  const lineId = document.getElementById('assignLine').value;

  if (!busId || !driverId || !lineId) {
    alert("Bitte alle Felder auswählen!");
    return;
  }

  const bus = gameState.buses.find(b => b.id === busId);
  const driver = gameState.drivers.find(d => d.id === driverId);
  const line = LINIEN[lineId];

  if (!bus || !driver || !line) return;

  const totalTime = FAHRZEITEN[lineId].reduce((a, b) => a + b, 0);
  const newHours = driver.hoursWorked + (totalTime / 60);
  if (newHours > driver.maxHours) {
    if (!confirm("Fahrer würde Überstunden machen. Trotzdem zuweisen?")) {
      return;
    }
  }

  // Prüfe: Muss Bus zur Start-Haltestelle fahren?
  const startStop = line[0];
  if (bus.position !== startStop) {
    addToLog(`🚛 ${bus.id} fährt leer von ${bus.position} nach ${startStop} (kostet Zeit, aber kein Geld).`);
    // In dieser Version: Bus wird teleportiert, aber in Zukunft könnte man Leerfahrt simulieren
    bus.position = startStop;
  }

  // Starte Linie
  bus.status = "im Einsatz";
  bus.assignedLine = lineId;
  bus.target = line[1];
  bus.progress = 0;
  bus.routeIndex = 1;

  driver.status = "im Einsatz";
  driver.assignedBus = busId;
  driver.hoursWorked = newHours;

  addToLog(`✅ ${driver.name} mit ${bus.id} auf ${lineId} gestartet.`);
  closeAssignmentDialog();
  updateUI();
}

// --- HILFSFUNKTIONEN ---
function addToLog(msg) {
  if (!gameState) return;
  const h = Math.floor(gameState.currentTime / 60) % 24;
  const m = Math.floor(gameState.currentTime) % 60;
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const entry = `[${timeStr}] ${msg}`;
  gameState.log.push(entry);
  const el = document.getElementById('gameLog');
  el.textContent = gameState.log.join('\n');
  el.scrollTop = el.scrollHeight;
}

function updateUI() {
  if (!gameState) return;
  document.getElementById('moneyDisplay').textContent = `💰 ${Math.floor(gameState.money).toLocaleString('de-DE')} €`;
  document.getElementById('nightDisplay').textContent = `🌙 Nacht ${gameState.night}`;
  const h = Math.floor(gameState.currentTime / 60) % 24;
  const m = Math.floor(gameState.currentTime) % 60;
  document.getElementById('timeDisplay').textContent = `🕒 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  // Zeige Zuweisungs-Button nur, wenn Simulation läuft und Ressourcen frei
  const freeBuses = gameState.buses.filter(b => b.status === "frei");
  const freeDrivers = gameState.drivers.filter(d => d.status === "frei" && d.hoursWorked < d.maxHours);
  const btn = document.getElementById('assignTripBtn');
  if (btn) {
    btn.style.display = (simulationInterval && freeBuses.length > 0 && freeDrivers.length > 0) ? 'inline-block' : 'none';
  }
}

// --- SPEICHERN / LADEN ---
function saveGame() {
  try {
    const saveData = {
      version: 4,
      night: gameState.night,
      money: gameState.money,
      currentTime: gameState.currentTime,
      buses: gameState.buses.map(b => ({ ...b })),
      drivers: gameState.drivers.map(d => ({ ...d, assignedBus: d.assignedBus })),
      waitingPassengers: { ...gameState.waitingPassengers }
    };
    localStorage.setItem('jamstadt_final', JSON.stringify(saveData));
    addToLog("💾 Spiel gespeichert!");
  } catch (e) {
    addToLog("❌ Speichern fehlgeschlagen.");
  }
}

function loadGame() {
  try {
    const data = JSON.parse(localStorage.getItem('jamstadt_final'));
    if (!data || data.version !== 4) {
      addToLog("❌ Kein kompatibler Speicherstand gefunden.");
      return;
    }

    gameState = {
      night: data.night,
      money: data.money,
      currentTime: data.currentTime,
      endTime: (24 + 5) * 60,
      buses: data.buses,
      drivers: data.drivers,
      waitingPassengers: data.waitingPassengers,
      currentEvent: null,
      log: []
    };

    document.getElementById('setupScreen').classList.remove('visible');
    document.getElementById('gameScreen').classList.add('visible');
    document.getElementById('mapNight').textContent = gameState.night;
    updateUI();
    drawMap();
    addToLog("📂 Spiel geladen!");
  } catch (e) {
    addToLog("❌ Laden fehlgeschlagen.");
  }
}

// --- EVENT LISTENER ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startGameBtn').addEventListener('click', startNewGame);
  document.getElementById('endNightBtn').addEventListener('click', toggleSimulation);
  document.getElementById('assignTripBtn').addEventListener('click', openAssignmentDialog);
  document.getElementById('saveGameBtn').addEventListener('click', saveGame);
  document.getElementById('loadGameBtn').addEventListener('click', loadGame);
  document.getElementById('newGameBtn').addEventListener('click', () => {
    if (simulationInterval) clearInterval(simulationInterval);
    simulationInterval = null;
    document.getElementById('gameScreen').classList.remove('visible');
    document.getElementById('setupScreen').classList.add('visible');
  });
});

// Globale Funktionen für Dialog
window.confirmAssignment = confirmAssignment;
window.closeAssignmentDialog = closeAssignmentDialog;
