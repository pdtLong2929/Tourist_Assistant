const preferenceMap = {
  market: "market", food: "food", price: "price", guide: "guide",
  service: "service", staff: "staff", park: "park", space: "space",
  view: "view", quality: "quality", temple: "temple", air: "air",
  trees: "trees", church: "church", shop: "shop", mall: "mall",
  floor: "floor", atmosphere: "atmosphere", city: "city", attitude: "attitude",
  culture: "culture", location: "location", markets: "markets", life: "life",
  clothes: "clothes", store: "store", scenery: "scenery", goods: "goods",
  tea: "tea", fun: "fun"
};


function mapPreferences(preferences = []) {
  const result = {};
  preferences.forEach((item) => {
    const key = preferenceMap[item.toLowerCase()];
    if (key) result[key] = 1.0;
  });
  return result;
}

module.exports = { mapPreferences };
