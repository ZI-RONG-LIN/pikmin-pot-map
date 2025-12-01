const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwF-CF0mHIcyE8o9BeWFeyq0HgCEe16HhM3fOYI60qZI8dHmhXeq0HE-MRm5KkOKW43-Z0GsHBKhFl/pub?output=csv";

let locations = [];
let speciesSet = new Set();
let currentPage = 1;       // 目前頁碼
const itemsPerPage = 5;    // 每頁顯示 5 個
let currentFiltered = [];  // 存放目前篩選後的結果

// 讀取 CSV
async function loadCSV() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const rows = text.split("\n").slice(1); // 去掉 header
  locations = rows.map(row => {
    const [name, species, lat, lng] = row.split(",");
    speciesSet.add(species.trim());
    return { name: name.trim(), species: species.trim(), lat: parseFloat(lat), lng: parseFloat(lng) };
  });
  populateSpecies();
}

// 填入下拉選單
function populateSpecies() {
  const select = document.getElementById("species");

  // 新增「種類不拘」選項在最前面
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


// 計算距離 (Haversine formula)
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // 地球半徑公尺
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 公尺
}
function showResultsPage(page = 1) {
  const resultDiv = document.getElementById("result");
  const totalPages = Math.ceil(currentFiltered.length / itemsPerPage);

  if (currentFiltered.length === 0) {
    resultDiv.innerHTML = "<p>附近沒有找到符合的花盆。</p>";
    return;
  }

  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, currentFiltered.length);
  const pageItems = currentFiltered.slice(startIndex, endIndex);

  let html = `<div class="card-list">`;
  pageItems.forEach(loc => {
    const walkTime = Math.round(loc.distance / 80);
    const bikeTime = Math.round(loc.distance / 500);

    html += `
      <div class="card">
        <h3><a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}" target="_blank">${loc.name}</a></h3>
        <p class="species-tag">${loc.species}</p>
        <p>距離: ${(loc.distance / 1000).toFixed(2)} km | 步行時間: ${walkTime} 分鐘 | 騎車時間: ${bikeTime} 分鐘</p>
      </div>
    `;
  });
  html += `</div>`;

  // 分頁按鈕
  html += `<div class="pagination" style="text-align:center; margin-top:10px;">`;
  if (page > 1) {
    html += `<button onclick="showResultsPage(${page - 1})">上一頁</button>`;
  }
  html += ` 第 ${page} / ${totalPages} 頁 `;
  if (page < totalPages) {
    html += `<button onclick="showResultsPage(${page + 1})">下一頁</button>`;
  }
  html += `</div>`;

  resultDiv.innerHTML = html;
  currentPage = page;
}

// 顯示結果
function showResults(userLat, userLng, species) {
  currentFiltered = locations
    .filter(loc => species === "all" || loc.species === species)
    .map(loc => {
      const distance = getDistance(userLat, userLng, loc.lat, loc.lng);
      return { ...loc, distance };
    })
    .filter(loc => loc.distance <= 7500)
    .sort((a, b) => a.distance - b.distance);

  showResultsPage(1); // 顯示第一頁
}


// 取得使用者位置
document.getElementById("locate").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      document.getElementById("latitude").value = pos.coords.latitude.toFixed(6);
      document.getElementById("longitude").value = pos.coords.longitude.toFixed(6);
    }, err => {
      alert("無法取得定位，請手動輸入經緯度");
    });
  } else {
    alert("您的瀏覽器不支援定位");
  }
});

// 查詢按鈕
document.getElementById("search").addEventListener("click", () => {
  const species = document.getElementById("species").value;
  const lat = parseFloat(document.getElementById("latitude").value);
  const lng = parseFloat(document.getElementById("longitude").value);

  if (!species) { alert("請選擇皮克敏種類"); return; }
  if (isNaN(lat) || isNaN(lng)) { alert("請輸入有效的經緯度"); return; }

  showResults(lat, lng, species);
});

// 初始化
loadCSV();
