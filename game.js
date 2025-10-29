// ==============================
// JAMSTADT NIGHT TRANSIT – VOLLVERSION (game.js)
// ==============================

// --- DATEN: LINIEN MIT DEINEN EXAKTEN HALTESTELLEN ---
const LINIEN = {
  N1: {
    name: "ZOB → Wenningbrück",
    stops: ["ZOB 1", "Schloss Vogelberg", "Neubelle, Rathaus", "Einkaufszentrum", "Süßwarenfabrik", "Wenningbrück, Grundschule"],
    times: [3, 2, 3, 2, 2] // Minuten zwischen Haltestellen
  },
  N2: {
    name: "ZOB → Oberorning",
    stops: ["ZOB 1", "Autohaus Kramer", "Meinberg-Gymnasium", "Jamstadt-Orning, Kläranlage", "Oberorning, Torstraße"],
    times: [2, 3, 2, 3]
  },
  N3: {
    name: "ZOB → Legoland",
    stops: ["ZOB 1", "Auring, Bibliothek", "Hierlingfeldsee", "Hierlingfeld, Botanischer Garten", "Printh, Schrottplatz", "Neuhierlingfeld, Legoland"],
    times: [3, 2, 2, 3, 3]
  },
  N4: {
    name: "ZOB → Campingbedarf",
    stops: ["ZOB 1", "Auring, Decathlon", "Blönk, Dorfrestaurant", "Flusing, Campingbedarf"],
    times: [3, 3, 4]
  },
  N5: {
    name: "ZOB → Herwald",
    stops: ["ZOB 1", "Bersdorf, Bürobedarf", "Bershofen, Hundertwasserstr.", "Herwald, Musikschule", "Herwald, Pfarrstadl"],
    times: [3, 3, 3, 2]
  },
  NS1: {
    name: "Sonder: ZOB → Einkaufszentrum",
    stops: ["ZOB 1", "Google-Hauptsitz", "In der Schneide", "Einkaufszentrum"],
    times: [2, 3, 2]
  }
};

// Basis-Passagiere pro Haltestelle
const PASSAGIER_BASIS = {
  "Einkaufszentrum": 15,
  "Google-Hauptsitz": 12,
  "Neuhierlingfeld, Legoland": 10,
  "Flusing, Campingbedarf": 8,
  "Herwald, Musikschule": 7,
  "Schloss Vogelberg": 6
};

// --- SPIELZUSTAND (wird bei Spielstart initialisiert) ---
let gameState = null;

// --- HELPER-FUNKTIONEN ---
function formatTime(totalMinutes) {
  // Wandelt Minuten seit Mitternacht in Uhrzeit um (auch über 24h)
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getRandomPassengers(stopName, multiplier = 1.0) {
  const base = PASSAGIER_BASIS[stopName] || 5;
  const randomFactor = 0.8 + Math.random() * 0.4; // ±20%
  return Math.max(0, Math.floor(base * randomFactor * multiplier));
}

function getTotalLineTime(lineId) {
  return LINIEN[lineId].times.reduce((sum, t) => sum + t, 0);
}

function getTimeFromZobToStart(lineId) {
  // Alle Linien starten am ZOB 1 → keine extra Fahrt nötig!
  // (Das ist realistisch für deinen Plan – alle Linien beginnen am ZOB)
  return 0;
}

// --- SPIEL INITIALISIEREN ---
function startNewGame() {
  const numBuses = parseInt(document.getElementById('numBuses').value) || 5;
  const numDrivers = parseInt(document.getElementById('numDrivers').value) || 5;
  const startMoney = parseInt(document.getElementById('startMoney').value) || 5000;

  if (numBuses < 1 || numBuses > 10 || numDrivers < 1 || numDrivers > 10 || startMoney < 1000) {
    alert("Bitte gültige Werte eingeben!");
    return;
  }

  // Busse erstellen
  const buses = [];
  for (let i = 1; i <= numBuses; i++) {
    buses.push({
      id: `B${String(i).padStart(3, '0')}`,
      model: i <= 2 ? "Elektro" : "Standard",
      available: true,
      assignedLine: null,
      position: "ZOB 1",
      nextAvailableTime: 23 * 60 // verfügbar ab 23:00
    });
  }

  // Fahrer erstellen
  const driverNames = [
    "Anna Müller", "Bernd Schmidt", "Clara Weber", "David Koch", "Elena Fischer",
    "Felix Bauer", "Greta Hoffmann", "Hans Klein", "Ingrid Wolf", "Jonas Schmitt"
  ];
  const drivers = [];
  for (let i = 0; i < numDrivers; i++) {
    drivers.push({
      id: `D${String(i+1).padStart(3, '0')}`,
      name: driverNames[i] || `Fahrer ${i+1}`,
      available: true,
      assignedBus: null,
      hoursWorked: 0,
      maxHours: 6 // Max 6 Std pro Nacht
    });
  }

  // Spielzustand
  gameState = {
    night: 1,
    money: startMoney,
    currentTime: 23 * 60, // Start: 23:00
    endTime: (24 + 5) * 60, // Ende: 05:00 nächste Nacht
    schedule: {
      N1: { freq: 2, active: true },
      N2: { freq: 1, active: true },
      N3: { freq: 1, active: true },
      N4: { freq: 1, active: true },
      N5: { freq: 1, active: true },
      NS1: { freq: 0, active: false }
    },
    buses,
    drivers,
    currentEvent: null,
    log: []
  };

  // UI wechseln
  document.getElementById('setupScreen').classList.remove('visible');
  document.getElementById('gameScreen').classList.add('visible');

  updateUI();
  addToLog("🎉 Willkommen bei Jamstadt Night Transit!");
  addToLog("📅 Nacht 1 beginnt um 23:00. Plane deine Fahrten!");
}

// --- LOGGING ---
function addToLog(message) {
  if (!gameState) return;
  const timeStr = formatTime(gameState.currentTime);
  const entry = `[${timeStr}] ${message}`;
  gameState.log.push(entry);
  
  const logEl = document.getElementById('gameLog');
  logEl.textContent = gameState.log.join('\n');
  logEl.scrollTop = logEl.scrollHeight;
}

// --- EREIGNISSE ---
function triggerRandomEvent() {
  if (Math.random() < 0.6) {
    const events = [
      { type: "baustelle", msg: "🚧 Baustelle auf N3! Keine Passagiere.", line: "N3", passengerMult: 0, salaryMult: 1 },
      { type: "party", msg: "🎉 Party im Einkaufszentrum! 3x Passagiere auf N1!", line: "N1", passengerMult: 3, salaryMult: 1 },
      { type: "streik", msg: "😡 Fahrerstreik! Gehälter +20%.", line: null, passengerMult: 1, salaryMult: 1.2 },
      { type: "regen", msg: "🌧️ Regen! +50% Passagiere überall!", line: null, passengerMult: 1.5, salaryMult: 1 }
    ];
    return events[Math.floor(Math.random() * events.length)];
  }
  return null;
}

// --- SIMULATION EINER NACHT ---
async function simulateNight() {
  if (!gameState) return;
  
  addToLog("🌙 === NACHT SIMULATION STARTET ===");
  
  // Ereignis für diese Nacht festlegen
  gameState.currentEvent = triggerRandomEvent();
  if (gameState.currentEvent) {
    addToLog("❗ " + gameState.currentEvent.msg);
    document.getElementById('eventBanner').textContent = gameState.currentEvent.msg;
    document.getElementById('eventBanner').classList.add('show');
  } else {
    document.getElementById('eventBanner').classList.remove('show');
  }

  // Fahrer & Busse zurücksetzen
  gameState.drivers.forEach(d => {
    d.available = true;
    d.assignedBus = null;
    d.hoursWorked = 0;
  });
  gameState.buses.forEach(b => {
    b.available = true;
    b.assignedLine = null;
  });

  let totalProfit = 0;
  gameState.currentTime = 23 * 60; // Reset auf 23:00

  // Für jede Linie: Fahrten planen
  for (const [lineId, config] of Object.entries(gameState.schedule)) {
    if (!config.active || config.freq <= 0) continue;

    const line = LINIEN[lineId];
    const totalTime = getTotalLineTime(lineId);
    const interval = (6 * 60) / config.freq; // 6 Stunden = 360 Min

    for (let trip = 0; trip < config.freq; trip++) {
      const departureTime = 23 * 60 + trip * interval;

      // Finde verfügbaren Bus und Fahrer
      const availableBus = gameState.buses.find(b => b.available);
      const availableDriver = gameState.drivers.find(d => d.available && d.hoursWorked + (totalTime / 60) <= d.maxHours);

      if (!availableBus || !availableDriver) {
        addToLog(`⚠️ ${lineId}: Kein Bus/Fahrer für Fahrt ${trip+1} um ${formatTime(departureTime)}`);
        continue;
      }

      // Zuweisung
      availableBus.available = false;
      availableBus.assignedLine = lineId;
      availableDriver.available = false;
      availableDriver.assignedBus = availableBus.id;

      // Berechne Passagiere
      let passengerMult = 1.0;
      if (gameState.currentEvent) {
        if (gameState.currentEvent.line === null || gameState.currentEvent.line === lineId) {
          passengerMult = gameState.currentEvent.passengerMult;
        }
      }
      let totalPassengers = 0;
      line.stops.forEach(stop => {
        totalPassengers += getRandomPassengers(stop, passengerMult);
      });

      // Einnahmen & Kosten
      const revenue = totalPassengers * 1.0;
      const fuelCost = totalTime * (availableBus.model === "Elektro" ? 0.3 : 0.5);
      const maintenance = (totalTime / 60) * 2.0;
      const baseSalary = 15.0;
      const salaryMult = gameState.currentEvent?.salaryMult || 1.0;
      const salary = (totalTime / 60) * baseSalary * salaryMult;
      const totalCost = fuelCost + maintenance + salary;
      const profit = revenue - totalCost;
      totalProfit += profit;

      availableDriver.hoursWorked += totalTime / 60;

      addToLog(`🚌 ${lineId} Fahrt ${trip+1}: ${totalPassengers} Passagiere | Gewinn: ${profit.toFixed(2)}€`);

      // Nach Fahrt wieder verfügbar (sofort, da nächste Fahrt erst später)
      availableBus.available = true;
      availableDriver.available = true;
    }
  }

  gameState.money += totalProfit;
  gameState.night++;
  addToLog(`✅ Nacht beendet! Gesamtgewinn: ${totalProfit.toFixed(2)}€ | Neuer Kontostand: ${gameState.money.toFixed(2)}€`);

  updateUI();
}

// --- UI AKTUALISIEREN ---
function updateUI() {
  if (!gameState) return;

  // Obere Stats
  document.getElementById('moneyDisplay').textContent = `💰 ${gameState.money.toLocaleString('de-DE')} €`;
  document.getElementById('nightDisplay').textContent = `🌙 Nacht ${gameState.night}`;
  document.getElementById('timeDisplay').textContent = `🕒 ${formatTime(gameState.currentTime)}`;

  // Busse
  const busesEl = document.getElementById('busesContainer');
  busesEl.innerHTML = '';
  gameState.buses.forEach(bus => {
    const div = document.createElement('div');
    div.className = `resource-card ${!bus.available ? 'bus-in-use' : ''}`;
    div.textContent = `${bus.id} (${bus.model}) ${bus.available ? '✅ frei' : '🔴 im Einsatz'}`;
    busesEl.appendChild(div);
  });

  // Fahrer
  const driversEl = document.getElementById('driversContainer');
  driversEl.innerHTML = '';
  gameState.drivers.forEach(driver => {
    const div = document.createElement('div');
    div.className = `resource-card ${!driver.available ? 'driver-in-use' : ''}`;
    div.textContent = `${driver.name} (${driver.hoursWorked.toFixed(1)}/6 Std) ${driver.available ? '✅ frei' : '🔴 im Einsatz'}`;
    driversEl.appendChild(div);
  });

  // Linienplan
  const linesEl = document.getElementById('linesContainer');
  linesEl.innerHTML = '';
  for (const [lineId, config] of Object.entries(gameState.schedule)) {
    const line = LINIEN[lineId];
    const div = document.createElement('div');
    div.className = 'line-item';
    
    const header = document.createElement('div');
    header.className = 'line-header';
    header.innerHTML = `<span class="line-title">${lineId}: ${line.name}</span><span>${config.freq}x</span>`;
    
    const info = document.createElement('div');
    info.className = 'line-info';
    info.textContent = `Dauer: ${getTotalLineTime(lineId)} Min | Haltestellen: ${line.stops.length}`;
    
    const controls = document.createElement('div');
    controls.className = 'line-controls';
    
    const minusBtn = document.createElement('button');
    minusBtn.textContent = '–';
    minusBtn.onclick = () => {
      if (config.freq > 0) {
        config.freq--;
        config.active = config.freq > 0;
        updateUI();
      }
    };
    
    const plusBtn = document.createElement('button');
    plusBtn.textContent = '+';
    plusBtn.onclick = () => {
      if (config.freq < 5) {
        config.freq++;
        config.active = true;
        updateUI();
      }
    };
    
    controls.appendChild(minusBtn);
    controls.appendChild(plusBtn);
    
    div.appendChild(header);
    div.appendChild(info);
    div.appendChild(controls);
    linesEl.appendChild(div);
  }
}

// --- SPEICHERN / LADEN ---
function saveGame() {
  if (!gameState) return;
  try {
    const saveData = {
      version: 1,
      gameState: gameState
    };
    localStorage.setItem('jamstadt_save', JSON.stringify(saveData));
    addToLog("💾 Spiel gespeichert!");
  } catch (e) {
    addToLog("❌ Fehler beim Speichern.");
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem('jamstadt_save');
    if (!saved) {
      addToLog("❌ Kein Speicherstand gefunden.");
      return;
    }
    const data = JSON.parse(saved);
    if (data.version === 1) {
      gameState = data.gameState;
      document.getElementById('setupScreen').classList.remove('visible');
      document.getElementById('gameScreen').classList.add('visible');
      updateUI();
      addToLog("📂 Spiel geladen!");
    }
  } catch (e) {
    addToLog("❌ Fehler beim Laden.");
  }
}

// --- EVENT LISTENER ---
document.addEventListener('DOMContentLoaded', () => {
  // Setup-Bildschirm
  document.getElementById('startGameBtn').addEventListener('click', startNewGame);
  
  // Spiel-Bildschirm
  document.getElementById('endNightBtn').addEventListener('click', simulateNight);
  document.getElementById('saveGameBtn').addEventListener('click', saveGame);
  document.getElementById('loadGameBtn').addEventListener('click', loadGame);
  document.getElementById('newGameBtn').addEventListener('click', () => {
    document.getElementById('gameScreen').classList.remove('visible');
    document.getElementById('setupScreen').classList.add('visible');
  });
});
