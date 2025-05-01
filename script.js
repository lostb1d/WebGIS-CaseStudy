// Initialize the map centered on Nepal
const map = L.map('map').setView([28.3949, 84.1240], 7);

// Add OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(map);

// Variables to store our data and layers
let earthquakesLayer;
let hospitalsLayer;
let schoolsLayer;
let governmentLayer;
let roadsLayer;
let bufferLayer;
let markerCluster;
let currentEarthquakeData = [];
let currentInfrastructureData = [];
let legend = null;

// Show loading overlay
const loadingOverlay = document.getElementById('loadingOverlay');

// Dummy infrastructure data
const dummyInfrastructure = {
    hospitals: [
        {name: "Tribhuvan University Teaching Hospital", lat: 27.7172, lng: 85.3240, type: "hospital"},
        {name: "Bir Hospital", lat: 27.7066, lng: 85.3142, type: "hospital"},
        {name: "Patan Hospital", lat: 27.6766, lng: 85.3166, type: "hospital"},
        {name: "B.P. Koirala Institute of Health Sciences", lat: 26.4536, lng: 87.2717, type: "hospital"},
        {name: "Manipal Teaching Hospital", lat: 28.2128, lng: 83.9873, type: "hospital"}
    ],
    schools: [
        {name: "Budhanilkantha School", lat: 27.7749, lng: 85.3676, type: "school"},
        {name: "St. Xavier's School", lat: 27.7172, lng: 85.3240, type: "school"},
        {name: "Rato Bangala School", lat: 27.7194, lng: 85.3428, type: "school"},
        {name: "Gandaki Boarding School", lat: 28.2380, lng: 84.0109, type: "school"},
        {name: "Little Angels' School", lat: 27.6781, lng: 85.3166, type: "school"}
    ],
    government: [
        {name: "Singha Durbar", lat: 27.6980, lng: 85.3174, type: "government"},
        {name: "District Administration Office Kathmandu", lat: 27.7058, lng: 85.3147, type: "government"},
        {name: "Nepal Police Headquarters", lat: 27.7172, lng: 85.3240, type: "government"},
        {name: "Central Bureau of Statistics", lat: 27.6850, lng: 85.3178, type: "government"},
        {name: "Department of Roads", lat: 27.6956, lng: 85.3158, type: "government"}
    ],
    roads: [
        {name: "Tribhuvan Highway", lat: 27.6844, lng: 85.2986, type: "road"},
        {name: "Prithvi Highway", lat: 27.6844, lng: 85.2986, type: "road"},
        {name: "Arnika Highway", lat: 27.6844, lng: 85.2986, type: "road"},
        {name: "East-West Highway", lat: 27.6844, lng: 85.2986, type: "road"},
        {name: "BP Highway", lat: 27.6844, lng: 85.2986, type: "road"}
    ]
};

// Function to show alert message
function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '1000';
    alert.style.maxWidth = '300px';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}

// Function to fetch earthquake data from USGS API
async function fetchEarthquakeData() {
    loadingOverlay.style.display = 'flex';
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate;
    
    try {
        const response = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2018-01-01&endtime=${endDate}&minlatitude=26.0&maxlatitude=30.5&minlongitude=80.0&maxlongitude=88.5&minmagnitude=3`);
        const data = await response.json();
        currentEarthquakeData = data.features;
        plotEarthquakes(currentEarthquakeData, true);
    } catch (error) {
        console.error("Error fetching earthquake data:", error);
        showAlert("Failed to fetch earthquake data. Using sample data instead.", "warning");
        useSampleEarthquakeData();
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Fallback function with sample earthquake data
function useSampleEarthquakeData() {
    const sampleData = {
        features: [
            {
                type: "Feature",
                properties: {
                    mag: 5.5,
                    place: "Near Kathmandu",
                    time: 1612345678901,
                    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000fake"
                },
                geometry: {
                    type: "Point",
                    coordinates: [85.3240, 27.7172]
                }
            },
            {
                type: "Feature",
                properties: {
                    mag: 4.8,
                    place: "Pokhara Region",
                    time: 1611234567890,
                    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000fake2"
                },
                geometry: {
                    type: "Point",
                    coordinates: [83.9873, 28.2128]
                }
            },
            {
                type: "Feature",
                properties: {
                    mag: 6.2,
                    place: "Eastern Nepal",
                    time: 1609876543210,
                    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000fake3"
                },
                geometry: {
                    type: "Point",
                    coordinates: [87.2717, 26.4536]
                }
            }
        ]
    };
    currentEarthquakeData = sampleData.features;
    plotEarthquakes(currentEarthquakeData, true);
}

// Function to plot earthquakes on the map
function plotEarthquakes(earthquakes, isInitialLoad = false) {
    if (earthquakesLayer) map.removeLayer(earthquakesLayer);
    if (markerCluster) map.removeLayer(markerCluster);

    markerCluster = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });
    
    earthquakes.forEach(quake => {
        const coords = quake.geometry.coordinates;
        const lat = coords[1];
        const lng = coords[0];
        const mag = quake.properties.mag;
        const place = quake.properties.place;
        const time = new Date(quake.properties.time).toLocaleString();
        const url = quake.properties.url;
        
        const size = Math.max(10, mag * 5);
        let color;
        
        if (mag < 4) color = '#4dac26';
        else if (mag < 5) color = '#b8e186';
        else if (mag < 6) color = '#fdae61';
        else color = '#d7191c';
        
        const marker = L.circleMarker([lat, lng], {
            radius: size,
            fillColor: color,
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });
        
        marker.bindPopup(`
            <div class="popup-content">
                <h6 class="fw-bold">${place}</h6>
                <div class="d-flex justify-content-between">
                    <span class="badge bg-${mag >= 6 ? 'danger' : mag >= 5 ? 'warning' : 'success'}">M${mag}</span>
                    <small class="text-muted">${time}</small>
                </div>
                <hr class="my-2">
                <p class="mb-1"><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                <a href="${url}" target="_blank" class="btn btn-sm btn-outline-primary w-100 mt-2">
                    <i class="bi bi-info-circle"></i> More details
                </a>
            </div>
        `, {maxWidth: 300});
        
        markerCluster.addLayer(marker);
    });
    
    map.addLayer(markerCluster);
    
    if (isInitialLoad) {
        addLegend();
    }
}

// Function to add legend
function addLegend() {
    if (legend) legend.remove();
    
    legend = L.control({position: 'bottomright'});
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
            <h6>Earthquake Magnitude</h6>
            <div><i style="background:#4dac26"></i> &lt; 4.0</div>
            <div><i style="background:#b8e186"></i> 4.0 - 4.9</div>
            <div><i style="background:#fdae61"></i> 5.0 - 5.9</div>
            <div><i style="background:#d7191c"></i> ≥ 6.0</div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

// Function to load infrastructure data
function loadInfrastructure() {
    if (hospitalsLayer) map.removeLayer(hospitalsLayer);
    if (schoolsLayer) map.removeLayer(schoolsLayer);
    if (governmentLayer) map.removeLayer(governmentLayer);
    if (roadsLayer) map.removeLayer(roadsLayer);
    
    currentInfrastructureData = [];
    
    // Hospitals
    const hospitalIcon = L.divIcon({className: 'hospital-icon', html: '<i class="bi bi-plus-lg"></i>', iconSize: [24, 24]});
    hospitalsLayer = L.layerGroup();
    dummyInfrastructure.hospitals.forEach(hospital => {
        const marker = L.marker([hospital.lat, hospital.lng], {icon: hospitalIcon});
        marker.bindPopup(`
            <div class="popup-content">
                <h6 class="fw-bold text-danger"><i class="bi bi-hospital"></i> ${hospital.name}</h6>
                <p class="mb-1"><strong>Type:</strong> Hospital</p>
                <p class="mb-1"><strong>Coordinates:</strong> ${hospital.lat.toFixed(4)}, ${hospital.lng.toFixed(4)}</p>
            </div>
        `);
        hospitalsLayer.addLayer(marker);
        currentInfrastructureData.push(hospital);
    });
    
    // Schools
    const schoolIcon = L.divIcon({className: 'school-icon', html: '<i class="bi bi-book"></i>', iconSize: [24, 24]});
    schoolsLayer = L.layerGroup();
    dummyInfrastructure.schools.forEach(school => {
        const marker = L.marker([school.lat, school.lng], {icon: schoolIcon});
        marker.bindPopup(`
            <div class="popup-content">
                <h6 class="fw-bold text-warning"><i class="bi bi-book"></i> ${school.name}</h6>
                <p class="mb-1"><strong>Type:</strong> School</p>
                <p class="mb-1"><strong>Coordinates:</strong> ${school.lat.toFixed(4)}, ${school.lng.toFixed(4)}</p>
            </div>
        `);
        schoolsLayer.addLayer(marker);
        currentInfrastructureData.push(school);
    });
    
    // Government offices
    const govIcon = L.divIcon({className: 'gov-icon', html: '<i class="bi bi-building"></i>', iconSize: [24, 24]});
    governmentLayer = L.layerGroup();
    dummyInfrastructure.government.forEach(gov => {
        const marker = L.marker([gov.lat, gov.lng], {icon: govIcon});
        marker.bindPopup(`
            <div class="popup-content">
                <h6 class="fw-bold" style="color: #6f42c1;"><i class="bi bi-building"></i> ${gov.name}</h6>
                <p class="mb-1"><strong>Type:</strong> Government Office</p>
                <p class="mb-1"><strong>Coordinates:</strong> ${gov.lat.toFixed(4)}, ${gov.lng.toFixed(4)}</p>
            </div>
        `);
        governmentLayer.addLayer(marker);
        currentInfrastructureData.push(gov);
    });
    
    // Major roads
    const roadIcon = L.divIcon({className: 'road-icon', html: '<i class="bi bi-signpost"></i>', iconSize: [24, 24]});
    roadsLayer = L.layerGroup();
    dummyInfrastructure.roads.forEach(road => {
        const marker = L.marker([road.lat, road.lng], {icon: roadIcon});
        marker.bindPopup(`
            <div class="popup-content">
                <h6 class="fw-bold" style="color: #20c997;"><i class="bi bi-signpost"></i> ${road.name}</h6>
                <p class="mb-1"><strong>Type:</strong> Major Road</p>
                <p class="mb-1"><strong>Coordinates:</strong> ${road.lat.toFixed(4)}, ${road.lng.toFixed(4)}</p>
            </div>
        `);
        roadsLayer.addLayer(marker);
        currentInfrastructureData.push(road);
    });
    
    if (document.getElementById('hospitalCheck').checked) map.addLayer(hospitalsLayer);
    if (document.getElementById('schoolCheck').checked) map.addLayer(schoolsLayer);
    if (document.getElementById('govCheck').checked) map.addLayer(governmentLayer);
    if (document.getElementById('roadCheck').checked) map.addLayer(roadsLayer);
}

// Function to analyze infrastructure at risk with prioritization
function analyzeInfrastructure() {
    const magnitudeFilter = parseFloat(document.getElementById('magnitudeRange').value);
    const distanceFilter = parseFloat(document.getElementById('distanceFilter').value);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    const filteredQuakes = currentEarthquakeData.filter(quake => {
        const quakeDate = new Date(quake.properties.time).toISOString().split('T')[0];
        return quake.properties.mag >= magnitudeFilter && 
               quakeDate >= startDate && 
               quakeDate <= endDate;
    });
    
    if (filteredQuakes.length === 0) {
        showAlert("No earthquakes found matching your criteria", "warning");
        return;
    }
    
    const includedTypes = [];
    if (document.getElementById('hospitalCheck').checked) includedTypes.push('hospital');
    if (document.getElementById('schoolCheck').checked) includedTypes.push('school');
    if (document.getElementById('govCheck').checked) includedTypes.push('government');
    if (document.getElementById('roadCheck').checked) includedTypes.push('road');
    
    if (includedTypes.length === 0) {
        showAlert("Please select at least one infrastructure type", "warning");
        return;
    }
    
    const filteredInfra = currentInfrastructureData.filter(infra => includedTypes.includes(infra.type));
    const atRiskInfrastructure = [];
    
    filteredQuakes.forEach(quake => {
        const quakeCoords = quake.geometry.coordinates;
        const quakePoint = turf.point([quakeCoords[0], quakeCoords[1]]);
        const buffer = turf.buffer(quakePoint, distanceFilter, {units: 'kilometers'});
        
        if (bufferLayer) map.removeLayer(bufferLayer);
        bufferLayer = L.geoJSON(buffer, {
            style: {
                color: '#ff7800',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.1
            }
        }).addTo(map);
        
        filteredInfra.forEach(infra => {
            const infraPoint = turf.point([infra.lng, infra.lat]);
            const distance = turf.distance(quakePoint, infraPoint, {units: 'kilometers'});
            
            if (distance <= distanceFilter) {
                let priorityScore = 0;
                if (infra.type === 'hospital' && quake.properties.mag > 5.0) {
                    priorityScore = 100 + quake.properties.mag * 10;
                } else if (infra.type === 'hospital') {
                    priorityScore = 50 + quake.properties.mag * 5;
                } else if (infra.type === 'government') {
                    priorityScore = 30 + quake.properties.mag * 3;
                } else {
                    priorityScore = quake.properties.mag;
                }
                
                atRiskInfrastructure.push({
                    type: infra.type,
                    name: infra.name,
                    distance: distance.toFixed(1),
                    quakeMag: quake.properties.mag,
                    quakePlace: quake.properties.place,
                    quakeTime: new Date(quake.properties.time).toLocaleString(),
                    coordinates: [infra.lat, infra.lng],
                    priorityScore: priorityScore
                });
            }
        });
    });
    
    displayPrioritizedResults(atRiskInfrastructure);
}

// Function to display prioritized results
function displayPrioritizedResults(results) {
    const summaryResults = document.getElementById('summaryResults');
    const resultsTable = document.getElementById('resultsTable');
    const resultsBody = document.getElementById('resultsBody');
    
    if (results.length === 0) {
        summaryResults.innerHTML = '<p class="text-muted text-center"><i class="bi bi-info-circle me-1"></i>No infrastructure found within the specified parameters.</p>';
        resultsTable.style.display = 'none';
        return;
    }
    
    results.sort((a, b) => b.priorityScore - a.priorityScore);
    
    const hospitalCount = results.filter(r => r.type === 'hospital').length;
    const highPriorityHospitals = results.filter(r => r.type === 'hospital' && r.quakeMag > 5.0).length;
    const schoolCount = results.filter(r => r.type === 'school').length;
    const govCount = results.filter(r => r.type === 'government').length;
    const roadCount = results.filter(r => r.type === 'road').length;
    
    summaryResults.innerHTML = `
        <h6 class="fw-bold">Infrastructure at Risk</h6>
        <div class="d-flex flex-wrap gap-2 mb-2">
            <span class="badge bg-primary">Total: ${results.length}</span>
            <span class="badge bg-danger">Hospitals: ${hospitalCount}</span>
            <span class="badge bg-warning text-dark">Schools: ${schoolCount}</span>
            <span class="badge" style="background-color: #6f42c1;">Gov: ${govCount}</span>
        </div>
        ${highPriorityHospitals > 0 ? `
        <div class="alert alert-danger p-2 mb-2">
            <i class="bi bi-exclamation-triangle-fill me-1"></i>
            <strong>Critical Priority:</strong> ${highPriorityHospitals} hospitals near high-magnitude earthquakes (M > 5.0)
        </div>
        ` : ''}
        ${hospitalCount > 0 ? `
        <div class="alert alert-warning p-2">
            <i class="bi bi-exclamation-circle-fill me-1"></i>
            <strong>High Priority:</strong> ${hospitalCount} total hospitals in risk zones
        </div>
        ` : ''}
    `;
    
    resultsBody.innerHTML = '';
    results.forEach(result => {
        const row = document.createElement('tr');
        
        let icon, rowClass = '';
        if (result.type === 'hospital' && result.quakeMag > 5.0) {
            icon = '<i class="bi bi-hospital text-danger"></i>';
            rowClass = 'table-danger';
        } else if (result.type === 'hospital') {
            icon = '<i class="bi bi-hospital text-warning"></i>';
            rowClass = 'table-warning';
        } else if (result.type === 'school') {
            icon = '<i class="bi bi-book text-primary"></i>';
        } else if (result.type === 'government') {
            icon = '<i class="bi bi-building" style="color: #6f42c1;"></i>';
        } else {
            icon = '<i class="bi bi-signpost" style="color: #20c997;"></i>';
        }
        
        const priorityBadge = result.type === 'hospital' ? 
            `<span class="badge bg-${result.quakeMag > 5.0 ? 'danger' : 'warning'}">
                ${result.quakeMag > 5.0 ? 'Critical' : 'High'} Priority
            </span>` : '';
        
        row.innerHTML = `
            <td class="${rowClass}">${icon} ${result.type}</td>
            <td class="${rowClass}">${result.name} ${priorityBadge}</td>
            <td class="${rowClass}">${result.distance} km</td>
            <td class="${rowClass}">
                <span class="badge bg-${result.quakeMag >= 6 ? 'danger' : result.quakeMag >= 5 ? 'warning' : 'success'}">
                    M${result.quakeMag}
                </span> 
                ${result.quakePlace}
            </td>
        `;
        row.addEventListener('click', () => {
            map.setView(result.coordinates, 14);
            if (bufferLayer) map.removeLayer(bufferLayer);
            const quakePoint = turf.point([result.coordinates[1], result.coordinates[0]]);
            const buffer = turf.buffer(quakePoint, parseFloat(document.getElementById('distanceFilter').value), {units: 'kilometers'});
            bufferLayer = L.geoJSON(buffer, {
                style: {
                    color: '#ff7800',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.1
                }
            }).addTo(map);
        });
        resultsBody.appendChild(row);
    });
    
    resultsTable.style.display = 'table';
}

// Event listeners
document.getElementById('magnitudeRange').addEventListener('input', function() {
    document.getElementById('magnitudeValue').textContent = `${this.value}+`;
});

document.getElementById('applyFilters').addEventListener('click', function() {
    const magnitudeFilter = parseFloat(document.getElementById('magnitudeRange').value);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    const filteredQuakes = currentEarthquakeData.filter(quake => {
        const quakeDate = new Date(quake.properties.time).toISOString().split('T')[0];
        return quake.properties.mag >= magnitudeFilter && 
               quakeDate >= startDate && 
               quakeDate <= endDate;
    });
    
    if (filteredQuakes.length === 0) {
        showAlert("No earthquakes found matching your criteria", "warning");
        return;
    }
    
    plotEarthquakes(filteredQuakes);
});

document.getElementById('analyzeBtn').addEventListener('click', analyzeInfrastructure);

document.querySelectorAll('.form-check-input').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        loadInfrastructure();
    });
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    fetchEarthquakeData();
    loadInfrastructure();
    
    const today = new Date();
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
});