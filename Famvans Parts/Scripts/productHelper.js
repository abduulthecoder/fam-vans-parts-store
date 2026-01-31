/**
 * Product Helper Functions
 * Provides utilities for product selection, filtering, and van matching
 */

// ============ INVENTORY HELPERS ============

/**
 * Get product by part number
 * @param {Array} inventory - The inventory array
 * @param {string} partNumber - The part number to search for
 * @returns {Object|null} - The product object or null if not found
 */
export function getProductByPartNumber(inventory, partNumber) {
  for (const category in inventory) {
    const product = inventory[category].find(p => p.part_number === partNumber);
    if (product) return { ...product, category };
  }
  return null;
}

/**
 * Get all products in a specific category
 * @param {Array} inventory - The inventory object
 * @param {string} categoryName - The category name
 * @returns {Array} - Array of products in the category
 */
export function getProductsByCategory(inventory, categoryName) {
  return inventory[categoryName] || [];
}

/**
 * Get all products that match a vehicle fitment
 * @param {Object} inventory - The inventory object
 * @param {string} vehicleIdentifier - Van year, make, model, or combination
 * @returns {Array} - Matching products with category info
 */
export function getProductsForVehicle(inventory, vehicleIdentifier) {
  const matchingProducts = [];
  const searchTerm = vehicleIdentifier.toLowerCase();

  for (const category in inventory) {
    const categoryProducts = inventory[category].filter(product => {
      return product.vehicle_fitment.toLowerCase().includes(searchTerm);
    });

    categoryProducts.forEach(product => {
      matchingProducts.push({ ...product, category });
    });
  }

  return matchingProducts;
}

/**
 * Filter products by multiple criteria
 * @param {Array} products - Array of products to filter
 * @param {Object} filters - Filter criteria (brand, minPrice, maxPrice, inStockOnly, etc.)
 * @returns {Array} - Filtered products
 */
export function filterProducts(products, filters = {}) {
  return products.filter(product => {
    // Brand filter
    if (filters.brand && product.brand !== filters.brand) return false;

    // Price range filter
    if (filters.minPrice && product.retail_price < filters.minPrice) return false;
    if (filters.maxPrice && product.retail_price > filters.maxPrice) return false;

    // Stock filter
    if (filters.inStockOnly && product.quantity_on_hand === 0) return false;
    if (filters.outOfStockOnly && product.quantity_on_hand > 0) return false;

    // Search term filter
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      const matchesPart = product.part_number?.toLowerCase().includes(search);
      const matchesDesc = product.part_description?.toLowerCase().includes(search);
      const matchesFit = product.vehicle_fitment?.toLowerCase().includes(search);

      if (!matchesPart && !matchesDesc && !matchesFit) return false;
    }

    // Category filter
    if (filters.category && product.category !== filters.category) return false;

    return true;
  });
}

/**
 * Sort products by various criteria
 * @param {Array} products - Array of products to sort
 * @param {string} sortBy - Sort criteria: 'price-low', 'price-high', 'name', 'stock'
 * @returns {Array} - Sorted products
 */
export function sortProducts(products, sortBy = 'name') {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-low':
      sorted.sort((a, b) => a.retail_price - b.retail_price);
      break;
    case 'price-high':
      sorted.sort((a, b) => b.retail_price - a.retail_price);
      break;
    case 'name':
      sorted.sort((a, b) => a.part_description.localeCompare(b.part_description));
      break;
    case 'stock':
      sorted.sort((a, b) => b.quantity_on_hand - a.quantity_on_hand);
      break;
    case 'job-price':
      sorted.sort((a, b) => {
        const jobPriceA = a.retail_price + (a.labor_hours * 50);
        const jobPriceB = b.retail_price + (b.labor_hours * 50);
        return jobPriceA - jobPriceB;
      });
      break;
    default:
      sorted.sort(() => Math.random() - 0.5);
  }

  return sorted;
}

/**
 * Calculate total job price (retail + labor)
 * @param {number} retailPrice - Retail price
 * @param {number} laborHours - Labor hours needed
 * @param {number} laborRate - Hourly rate (default: $50)
 * @returns {number} - Total job price
 */
export function calculateJobPrice(retailPrice, laborHours, laborRate = 50) {
  return retailPrice + (laborHours * laborRate);
}

/**
 * Get all unique brands from inventory
 * @param {Object} inventory - The inventory object
 * @returns {Array} - Sorted array of brand names
 */
export function getAllBrands(inventory) {
  const brands = new Set();
  for (const category in inventory) {
    inventory[category].forEach(product => {
      if (product.brand) brands.add(product.brand);
    });
  }
  return Array.from(brands).sort();
}

/**
 * Get all categories from inventory
 * @param {Object} inventory - The inventory object
 * @returns {Array} - Array of category names
 */
export function getAllCategories(inventory) {
  return Object.keys(inventory).sort();
}

/**
 * Get price range statistics
 * @param {Array} products - Array of products
 * @returns {Object} - Min, max, and average prices
 */
export function getPriceStats(products) {
  if (products.length === 0) return { min: 0, max: 0, average: 0 };

  const prices = products.map(p => p.retail_price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;

  return { min, max, average };
}

// ============ VAN DATABASE HELPERS ============

/**
 * Find van by specifications
 * @param {Array} vans - Array of van objects
 * @param {Object} specs - Van specifications (year, make, model, type, etc.)
 * @returns {Array} - Matching vans
 */
export function findVansBySpecs(vans, specs = {}) {
  return vans.filter(van => {
    if (specs.year && van.year !== specs.year) return false;
    if (specs.make && van.make !== specs.make) return false;
    if (specs.model && van.model !== specs.model) return false;
    if (specs.type && van.type !== specs.type) return false;
    if (specs.roof && van.roof !== specs.roof) return false;
    if (specs.wheelbase && van.wheelbase !== specs.wheelbase) return false;
    if (specs.engine && van.engine !== specs.engine) return false;
    return true;
  });
}

/**
 * Get all unique years from van database
 * @param {Array} vans - Array of van objects
 * @returns {Array} - Sorted years (descending)
 */
export function getAvailableYears(vans) {
  const years = [...new Set(vans.map(v => v.year))];
  return years.sort((a, b) => b - a);
}

/**
 * Get all makes for a given year
 * @param {Array} vans - Array of van objects
 * @param {number} year - Year to filter by
 * @returns {Array} - Sorted makes
 */
export function getMakesForYear(vans, year) {
  const makes = [
    ...new Set(vans.filter(v => v.year === year).map(v => v.make))
  ];
  return makes.sort();
}

/**
 * Get all models for a given year and make
 * @param {Array} vans - Array of van objects
 * @param {number} year - Year to filter by
 * @param {string} make - Make to filter by
 * @returns {Array} - Array of {model, modelNumber} objects
 */
export function getModelsForYearAndMake(vans, year, make) {
  const filtered = vans.filter(v => v.year === year && v.make === make);

  // Get unique model combinations
  const modelMap = new Map();
  filtered.forEach(van => {
    if (!modelMap.has(van.model)) {
      modelMap.set(van.model, van.model_number);
    }
  });

  const models = Array.from(modelMap.entries()).map(([model, modelNumber]) => ({
    model,
    modelNumber
  }));

  return models.sort((a, b) => a.model.localeCompare(b.model));
}

/**
 * Get van details by model number
 * @param {Array} vans - Array of van objects
 * @param {string} modelNumber - Model number to search
 * @returns {Object|null} - Van object or null if not found
 */
export function getVanByModelNumber(vans, modelNumber) {
  return vans.find(v => v.model_number === modelNumber) || null;
}

/**
 * Get all variations of a van model (different years, roofs, wheelbases)
 * @param {Array} vans - Array of van objects
 * @param {string} make - Make of the van
 * @param {string} model - Model of the van
 * @returns {Array} - All variations of the van
 */
export function getVanVariations(vans, make, model) {
  return vans.filter(v => v.make === make && v.model === model)
    .sort((a, b) => a.year - b.year);
}

/**
 * Get compatible products for a specific van
 * @param {Array} vans - Van database
 * @param {Object} inventory - Inventory object
 * @param {Object} vanSpecs - Van specifications
 * @returns {Array} - Compatible products with category
 */
export function getCompatibleProducts(vans, inventory, vanSpecs) {
  // Find matching van
  const van = findVansBySpecs(vans, vanSpecs)[0];
  if (!van) return [];

  // Build search identifier
  const searchIdentifiers = [
    `${van.year}`,
    `${van.make}`,
    `${van.model}`,
    `${van.make} ${van.model}`,
    `${van.year} ${van.make}`,
    van.type
  ];

  const compatibleProducts = new Set();

  for (const category in inventory) {
    inventory[category].forEach(product => {
      const fitment = product.vehicle_fitment.toLowerCase();
      const matches = searchIdentifiers.some(id =>
        fitment.includes(id.toLowerCase())
      );

      if (matches) {
        compatibleProducts.add(JSON.stringify({ ...product, category }));
      }
    });
  }

  return Array.from(compatibleProducts).map(p => JSON.parse(p));
}

/**
 * Generate van search query string
 * @param {Object} specs - Van specifications
 * @returns {string} - URL query string
 */
export function generateVanQueryString(specs = {}) {
  const params = new URLSearchParams();
  if (specs.year) params.append('year', specs.year);
  if (specs.make) params.append('make', specs.make);
  if (specs.model) params.append('model', specs.model);
  if (specs.type) params.append('type', specs.type);
  return params.toString();
}
