const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwF-CF0mHIcyE8o9BeWFeyq0HgCEe16HhM3fOYI60qZI8dHmhXeq0HE-MRm5KkOKW43-Z0GsHBKhFl/pub?output=csv";

let locations = [];
let speciesSet = new Set();
let citySet = new Set();
let currentPage = 1;
const itemsPerPage = 5;
let currentFiltered = [];
let userPosition = null; // 用於存使用者定位

// 讀取 CSV
async function loadCSV() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const rows = text.split("\n").slice(1);
  locations = rows.map(row => {
    const [name, species, lat, lng, city] = row.split(",");
    speciesSet.add(species.trim());
    if(city) citySet.add(city.trim());
    return { name: name.trim(), species: species.trim(), lat: parseFloat(lat), lng: parseFloat(lng), city: city ? city.trim() : "" };
  });
  populateSpecies();
  populateCities();
}

// 填入種類下拉
function populateSpecies() {
  const select = document.getElementById("species");
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "種類不拘";
  select.appendChild(allOption);
  Array.from(speciesSet).sort().forEach(spec => {
    const option = document.createElement("option");
    option.value = spec;
    option.textContent = spec;
    select.appendChild(option);
  });
}

// 填入縣市下拉
function populateCities() {
  const select = document.getElementById("city-select");
  Array.from(citySet).sort().forEach(city => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    select.appendChild(option);
  });
}

// Haversine 計算距離
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // 公尺
}

function formatTime(minutes) {
  if (minutes < 60) return `${minutes} 分鐘`;
  return `${(minutes / 60).toFixed(1)} 小時`;
}

// 顯示分頁
function showResultsPage(page = 1) {
  const resultDiv = document.getElementById("result");
  const totalPages = Math.ceil(currentFiltered.length / itemsPerPage);

  if (currentFiltered.length === 0) {
    resultDiv.innerHTML = "<p>找不到符合的花盆。</p>";
    return;
  }

  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, currentFiltered.length);
  const pageItems = currentFiltered.slice(startIndex, endIndex);

  let html = `<div class="card-list">`;
  pageItems.forEach(loc => {
    let distanceHtml = "";
    if(userPosition) {
      const distance = getDistance(userPosition.lat, userPosition.lng, loc.lat, loc.lng);
      const walkTime = Math.round(distance / 80);
      const bikeTime = Math.round(distance / 500);
      distanceHtml = `<p>距離: ${(distance / 1000).toFixed(2)} km | 步行時間: ${formatTime(walkTime)} | 騎車時間: ${formatTime(bikeTime)}</p>`;
    }
    html += `
      <div class="card">
        <h3><a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}" target="_blank">${loc.name}</a></h3>
        <p class="species-tag">${loc.species}</p>
        ${distanceHtml}
      </div>
    `;
  });
  html += `</div>`;

  html += `<div class="pagination" style="text-align:center; margin-top:10px;">`;
  if (page > 1) html += `<button onclick="showResultsPage(${page - 1})">上一頁</button>`;
  html += ` 第 ${page} / ${totalPages} 頁 `;
  if (page < totalPages) html += `<button onclick="showResultsPage(${page + 1})">下一頁</button>`;
  html += `</div>`;

  resultDiv.innerHTML = html;
  currentPage = page;
}

// 使用定位查詢
function searchByLocation() {
  const species = document.getElementById("species").value;
  const lat = parseFloat(document.getElementById("latitude").value);
  const lng = parseFloat(document.getElementById("longitude").value);

  if (!species) { alert("請選擇皮克敏種類"); return; }
  if (isNaN(lat) || isNaN(lng)) { alert("請輸入有效的經緯度"); return; }

  userPosition = { lat, lng };

  currentFiltered = locations
    .filter(loc => species === "all" || loc.species === species)
    .map(loc => ({ ...loc, distance: getDistance(lat, lng, loc.lat, loc.lng) }))
    .filter(loc => loc.distance <= 7500) // 15分鐘車程
    .sort((a,b)=>a.distance - b.distance);

  showResultsPage(1);
}

// 使用縣市查詢
function searchByCity() {
  const species = document.getElementById("species").value;
  const city = document.getElementById("city-select").value;

  if (!species) { alert("請選擇皮克敏種類"); return; }
  if (!city) { alert("請選擇縣市"); return; }

  // 如果有定位則計算距離，沒有則 distance 為 null
  currentFiltered = locations
    .filter(loc => (species === "all" || loc.species === species) && loc.city === city)
    .map(loc => loc)
    .sort((a,b)=>a.name.localeCompare(b.name));

  showResultsPage(1);
}

// Tab 切換
const tabLocation = document.getElementById("tab-location");
const tabCity = document.getElementById("tab-city");

function clearResults() {
  document.getElementById("result").innerHTML = "";
}

tabLocation.addEventListener("click", ()=>{
  tabLocation.classList.add("active");
  tabCity.classList.remove("active");
  document.getElementById("location-inputs").classList.remove("hidden");
  document.getElementById("city-inputs").classList.add("hidden");
  clearResults();
});

tabCity.addEventListener("click", ()=>{
  tabCity.classList.add("active");
  tabLocation.classList.remove("active");
  document.getElementById("city-inputs").classList.remove("hidden");
  document.getElementById("location-inputs").classList.add("hidden");
  clearResults();
});

// 定位按鈕
document.getElementById("locate").addEventListener("click", ()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      document.getElementById("latitude").value = pos.coords.latitude.toFixed(6);
      document.getElementById("longitude").value = pos.coords.longitude.toFixed(6);
      userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    },()=>{ alert("無法取得定位"); userPosition = null; });
  } else { alert("您的瀏覽器不支援定位"); userPosition = null; }
});

// 查詢按鈕
document.getElementById("search-location").addEventListener("click", searchByLocation);
document.getElementById("search-city").addEventListener("click", searchByCity);

// 初始化
loadCSV();
