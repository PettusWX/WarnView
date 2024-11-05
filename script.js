const eventTypes = {
    "Radar Indicated Tornado Warning": "tornado-warning",
    "Observed Tornado Warning": "observed-tornado-warning",
    "PDS Tornado Warning": "pds-tornado-warning",
    "Tornado Emergency": "tornado-emergency",
    "Severe Thunderstorm Warning": "severe-thunderstorm-warning", // Regular
    "Considerable Severe Thunderstorm Warning": "severe-thunderstorm-considerable", // Considerable
    "Destructive Severe Thunderstorm Warning": "pds-severe-thunderstorm-warning", // PDS (Destructive)
    "Flash Flood Warning": "flash-flood-warning",
    "Tornado Watch": "tornado-watch",
    "Severe Thunderstorm Watch": "severe-thunderstorm-watch",
    "Winter Weather Advisory": "winter-weather-advisory",
    "Winter Storm Watch": "winter-storm-watch",
    "Winter Storm Warning": "winter-storm-warning"
};

const priority = {
    "Tornado Emergency": 1,
    "PDS Tornado Warning": 2,
    "Observed Tornado Warning": 3,
    "Radar Indicated Tornado Warning": 4,
    "Destructive Severe Thunderstorm Warning": 5, // PDS
    "Considerable Severe Thunderstorm Warning": 6, // Considerable
    "Severe Thunderstorm Warning": 7, // Regular
    "Tornado Watch": 8,
    "Severe Thunderstorm Watch": 9,
    "Flash Flood Warning": 10,
    "Winter Weather Advisory": 11,
    "Winter Storm Watch": 12,
    "Winter Storm Warning": 13
};

const warningListElement = document.getElementById('warningList');
const expirationElement = document.getElementById('expiration');
const eventTypeElement = document.getElementById('eventType');
const countiesElement = document.getElementById('counties');

const tornadoCountElement = document.getElementById('tornadoCount');
const thunderstormCountElement = document.getElementById('thunderstormCount');
const floodCountElement = document.getElementById('floodCount');
const winterWeatherCountElement = document.getElementById('winterWeatherCount'); // New element for winter weather counts

const labels = {
    tornado: "TORNADO WARNINGS",
    thunderstorm: "SEVERE THUNDERSTORM WARNINGS",
    flood: "FLASH FLOOD WARNINGS",
    winter: "WINTER WEATHER WARNINGS"
};

let currentWarningIndex = 0;
let activeWarnings = [];
let previousWarnings = new Map();

document.body.addEventListener('click', enableSound);

function enableSound() {
    document.body.removeEventListener('click', enableSound);
    tornadoSound.play().catch(() => {});
}

// Create a header for the warning list
const headerElement = document.createElement('div');
headerElement.textContent = "Latest Alerts:"; // Add colon at the end
headerElement.className = 'warning-list-header'; // Add a class for styling if needed

// Prepend the header to the warning list
warningListElement.prepend(headerElement);

// Fetch data from NWS API for active alerts
async function fetchWarnings() {
    try {
        const response = await fetch('https://api.weather.gov/alerts/active');
        const data = await response.json();
        const warnings = data.features.filter(feature =>
            ["Tornado Warning", "Severe Thunderstorm Warning", "Flash Flood Warning", "Tornado Watch", "Severe Thunderstorm Watch", "Winter Weather Advisory", "Winter Storm Warning", "Winter Storm Watch"].includes(feature.properties.event)
        );

        let tornadoCount = 0;
        let thunderstormCount = 0;
        let floodCount = 0;
        let winterWeatherCount = 0; // Counter for winter weather events

        warnings.forEach(warning => {
            const eventName = warning.properties.event;
            if (eventName === "Tornado Warning") {
                const detectionType = warning.properties.parameters?.tornadoDetection?.[0]; // Get the first item in the array
                const damageThreat = warning.properties.parameters?.tornadoDamageThreat?.[0]; // Get the first item in the array
                if (detectionType === "OBSERVED") {
                    if (damageThreat === "CONSIDERABLE") {
                        tornadoCount++; // Count as PDS Tornado Warning
                    } else if (damageThreat === "CATASTROPHIC") {
                        tornadoCount++; // Count as Tornado Emergency
                    } else {
                        tornadoCount++; // Count as Radar Indicated Tornado Warning
                    }
                } else {
                    tornadoCount++; // Count as Radar Indicated Tornado Warning
                }
            } else if (eventName === "Severe Thunderstorm Warning") {
                const damageThreat = warning.properties.parameters?.thunderstormDamageThreat?.[0]; // Get the first item in the array
                if (damageThreat === "CONSIDERABLE") {
                    thunderstormCount++; // Count as Considerable Severe Thunderstorm Warning
                } else if (damageThreat === "DESTRUCTIVE") {
                    thunderstormCount++; // Count as Destructive Severe Thunderstorm Warning (PDS)
                } else {
                    thunderstormCount++; // Count as regular Severe Thunderstorm Warning
                }
            } else if (eventName === "Flash Flood Warning") {
                floodCount++;
            } else if (eventName === "Winter Weather Advisory") {
                winterWeatherCount++; // Count winter weather advisories
            } else if (eventName === "Winter Storm Warning") {
                winterWeatherCount++; // Count winter storm warnings
            } else if (eventName === "Winter Storm Watch") {
                winterWeatherCount++; // Count winter storm watches
            }
        });

        tornadoCountElement.textContent = `${labels.tornado}: ${tornadoCount}`;
        thunderstormCountElement.textContent = `${labels.thunderstorm}: ${thunderstormCount}`;
        floodCountElement.textContent = `${labels.flood}: ${floodCount}`;
        winterWeatherCountElement.textContent = `${labels.winter}: ${winterWeatherCount}`; // Update winter weather count

        // Sort warnings by issuance time (newest first)
        warnings.sort((a, b) => new Date(b.properties.sent) - new Date(a.properties.sent));
        
        activeWarnings = warnings;

        updateWarningList(warnings);

        warnings.forEach(warning => {
            const warningId = warning.id;
            if (!previousWarnings.has(warningId)) {
                playWarningSound(getEventName(warning), warning);
                previousWarnings.set(warningId, warning.properties.event);
            }
        });

    } catch (error) {
        console.error('Error fetching warnings:', error);
    }
}

// Helper function to determine the displayed event name
function getEventName(warning) {
    const eventName = warning.properties.event;
    if (eventName === "Tornado Warning") {
        const detectionType = warning.properties.parameters?.tornadoDetection?.[0]; // Get the first item in the array
        const damageThreat = warning.properties.parameters?.tornadoDamageThreat?.[0]; // Get the first item in the array
        if (detectionType === "OBSERVED") {
            if (damageThreat === "CONSIDERABLE") {
                return "PDS Tornado Warning"; // PDS
            } else if (damageThreat === "CATASTROPHIC") {
                return "Tornado Emergency"; // Tornado Emergency
            } else {
                return "Observed Tornado Warning"; // Confirmed but not PDS
            }
        } else {
            return "Radar Indicated Tornado Warning"; // Correct format
        }
    } else if (eventName === "Severe Thunderstorm Warning") {
        const damageThreat = warning.properties.parameters?.thunderstormDamageThreat?.[0]; // Get the first item in the array
        if (damageThreat === "CONSIDERABLE") {
            return "Considerable Severe Thunderstorm Warning"; // Considerable
        } else if (damageThreat === "DESTRUCTIVE") {
            return "Destructive Severe Thunderstorm Warning"; // Destructive
        }
    } else if (eventName === "Winter Weather Advisory") {
        return "Winter Weather Advisory"; // Winter Weather Advisory
    } else if (eventName === "Winter Storm Warning") {
        return "Winter Storm Warning"; // Winter Storm Warning
    } else if (eventName === "Winter Storm Watch") {
        return "Winter Storm Watch"; // Winter Storm Watch
    }
    return eventName; // Return as is for other events
}

function updateDashboard() {
    if (activeWarnings.length === 0) {
        expirationElement.textContent = '';
        eventTypeElement.textContent = 'NO ACTIVE WARNINGS';
        countiesElement.textContent = '';
        return;
    }

    const hasTornadoWarningOrWatch = activeWarnings.some(warning =>
        warning.properties.event === "Tornado Warning" || warning.properties.event === "Tornado Watch"
    );

    const filteredWarnings = hasTornadoWarningOrWatch
        ? activeWarnings.filter(warning => warning.properties.event !== "Flash Flood Warning")
        : activeWarnings;

    if (filteredWarnings.length === 0) {
        expirationElement.textContent = '';
        eventTypeElement.textContent = 'NO ACTIVE WARNINGS';
        countiesElement.textContent = '';
        return;
    }

    const warning = filteredWarnings[currentWarningIndex];
    let eventName = getEventName(warning); // Use the helper function

    const expirationDate = new Date(warning.properties.expires);
    const options = { 
        timeZoneName: 'short',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const formattedExpirationTime = expirationDate.toLocaleString('en-US', options);

    const counties = formatCountiesTopBar(warning.properties.areaDesc);
    expirationElement.textContent = `Expires: ${formattedExpirationTime}`;

    // Update display format
    eventTypeElement.textContent = eventName; // Correct format
    countiesElement.textContent = counties;
    eventTypeElement.className = `event-type-bar ${eventTypes[eventName]}`;
    currentWarningIndex = (currentWarningIndex + 1) % filteredWarnings.length;
}

function formatCountiesTopBar(areaDesc) {
    const counties = areaDesc.split('; ');
    let formattedCounties = counties.slice(0, 6).map(county => {
        const parts = county.split(',');
        if (parts.length > 1) {
            return `${parts[0].trim()} County, ${parts[1].trim()}`; // Format: "County name County, State"
        }
        return county; // Fallback if the format is unexpected
    });
    if (counties.length > 6) {
        formattedCounties.push("...");
    }
    return formattedCounties.join('; ');
}

function updateWarningList(warnings) {
    const latestWarnings = warnings.slice(0, 10);
    const existingWarningElements = warningListElement.getElementsByClassName('warning-box');
    const existingWarningsMap = new Map();

    for (let element of existingWarningElements) {
        const warningId = element.getAttribute('data-warning-id');
        existingWarningsMap.set(warningId, element);
    }

    latestWarnings.forEach(warning => {
        const warningId = warning.id;
        const eventName = getEventName(warning); // Use the helper function
        const counties = formatCountiesTopBar(warning.properties.areaDesc);
        const displayText = `${eventName} - ${counties}`; // Update to the new format

        if (previousWarnings.has(warningId)) {
            const previousEvent = previousWarnings.get(warningId);
            if (previousEvent !== eventName) {
                upgradeSound.play().catch(error => console.error('Error playing upgrade sound:', error));
            }
        }

        if (existingWarningsMap.has(warningId)) {
            const warningElement = existingWarningsMap.get(warningId);
            warningElement.textContent = displayText;
            warningElement.className = `warning-box ${eventTypes[eventName]}`; // Ensure the correct class is set for styling

            // Manually set the background color based on event type
            if (eventName === "Winter Storm Warning") {
                warningElement.style.backgroundColor = "rgb(255, 88, 233)";
            } else if (eventName === "Winter Storm Watch") {
                warningElement.style.backgroundColor = "rgb(0, 0, 255)";
            } else if (eventName === "Winter Weather Advisory") {
                warningElement.style.backgroundColor = "rgb(169, 81, 220)";
            }

        } else {
            const warningBox = document.createElement('div');
            warningBox.className = `warning-box ${eventTypes[eventName]}`; // Set the class based on event type
            warningBox.setAttribute('data-warning-id', warningId);
            warningBox.textContent = displayText;

            // Manually set the background color based on event type
            if (eventName === "Winter Storm Warning") {
                warningBox.style.backgroundColor = "rgb(255, 88, 233)";
            } else if (eventName === "Winter Storm Watch") {
                warningBox.style.backgroundColor = "rgb(0, 0, 255)";
            } else if (eventName === "Winter Weather Advisory") {
                warningBox.style.backgroundColor = "rgb(169, 81, 220)";
            }

            // Flash the box for 5 seconds
            warningBox.style.animation = 'flash 0.5s alternate infinite'; // Add flash effect

            warningListElement.appendChild(warningBox);

            // Stop flashing after 5 seconds
            setTimeout(() => {
                warningBox.style.animation = ''; // Remove flash effect
            }, 5000);
        }

        previousWarnings.set(warningId, eventName);
    });

    for (let [warningId, element] of existingWarningsMap) {
        if (!latestWarnings.find(warning => warning.id === warningId)) {
            warningListElement.removeChild(element);
            previousWarnings.delete(warningId);
        }
    }
}

// Fetch data and update every 3 seconds for immediate alert detection
setInterval(fetchWarnings, 3000);

// Update event display every 10 seconds
setInterval(updateDashboard, 10000);

fetchWarnings();
updateDashboard();
