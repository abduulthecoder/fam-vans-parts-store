// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

// Import product helper functions
import {
  getProductsForVehicle,
  filterProducts,
  sortProducts,
  calculateJobPrice,
  getAllBrands,
  getAllCategories,
  findVansBySpecs,
  getAvailableYears,
  getMakesForYear,
  getModelsForYearAndMake,
  getCompatibleProducts
} from './productHelper.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLZ3XzE8JPX9cSTZuqUuGSX1C7hEB-D9s",
  authDomain: "fam-vans-parts.firebaseapp.com",
  databaseURL: "https://fam-vans-parts-default-rtdb.firebaseio.com",
  projectId: "fam-vans-parts",
  storageBucket: "fam-vans-parts.firebasestorage.app",
  messagingSenderId: "476576617089",
  appId: "1:476576617089:web:1d0f09f7e70440c8ed7380",
  measurementId: "G-LY52930H15"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Global variables
let vansDatabase = [];
let allProducts = [];
let filteredProducts = [];
let baseFilteredProducts = [];
const productsPerPage = 12;
let currentPage = 1;
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

// Van Selector Elements
const yearSelect = document.getElementById('year-select');
const makeSelect = document.getElementById('make-select');
const modelSelect = document.getElementById('model-select');
const searchBtn = document.getElementById('search-btn');

// ============ VAN SELECTOR LOGIC ============

// Load vans database from JSON
async function loadVansDatabase() {
  try {
    const response = await fetch('../Models/vans.json');
    const data = await response.json();
    // Filter out passenger minivans - keep only cargo/commercial vans
    const passengerMinivans = ['Odyssey', 'Sienna', 'Voyager'];
    vansDatabase = data.vans.filter(van => !passengerMinivans.includes(van.model));
    populateYears();
  } catch (error) {
    console.error('Error loading vans database:', error);
    alert('Error loading van data. Please refresh the page.');
  }
}

// Populate years from database
function populateYears() {
  const years = getAvailableYears(vansDatabase);
  yearSelect.innerHTML = '<option value="">Select Year</option>';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}

// Populate makes based on selected year
function populateMakes() {
  makeSelect.innerHTML = '<option value="">Select Make</option>';
  modelSelect.innerHTML = '<option value="">Select Model</option>';

  const selectedYear = parseInt(yearSelect.value);
  
  if (!selectedYear) {
    // If no year selected, show all makes
    const makes = [...new Set(vansDatabase.map(van => van.make))].sort();
    makes.forEach(make => {
      const option = document.createElement('option');
      option.value = make;
      option.textContent = make;
      makeSelect.appendChild(option);
    });
  } else {
    // Show makes for selected year
    const makes = getMakesForYear(vansDatabase, selectedYear);
    makes.forEach(make => {
      const option = document.createElement('option');
      option.value = make;
      option.textContent = make;
      makeSelect.appendChild(option);
    });
  }
}

// Populate models based on selected year and make
function populateModels() {
  modelSelect.innerHTML = '<option value="">Select Model</option>';

  const selectedYear = parseInt(yearSelect.value);
  const selectedMake = makeSelect.value;

  if (!selectedYear && !selectedMake) {
    // No filters - show all models
    const allModels = [...new Set(vansDatabase.map(v => v.model))].sort();
    allModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
  } else if (selectedYear && selectedMake) {
    // Both year and make selected
    const models = getModelsForYearAndMake(vansDatabase, selectedYear, selectedMake);
    models.forEach(({ model, modelNumber }) => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = `${model} (${modelNumber})`;
      modelSelect.appendChild(option);
    });
  } else if (selectedYear) {
    // Only year selected
    const models = [...new Set(
      vansDatabase.filter(v => v.year === selectedYear).map(v => v.model)
    )].sort();
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
  } else if (selectedMake) {
    // Only make selected
    const models = [...new Set(
      vansDatabase.filter(v => v.make === selectedMake).map(v => v.model)
    )].sort();
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
  }
}

// Event listeners for dynamic filtering
yearSelect.addEventListener('change', () => {
  populateMakes();
  populateModels();
});

makeSelect.addEventListener('change', () => {
  populateModels();
});

// Search functionality
searchBtn.addEventListener('click', function() {
  const year = yearSelect.value;
  const make = makeSelect.value;
  const model = modelSelect.value;

  // Validate that at least one option is selected
  if (!year && !make && !model) {
    alert('Please select at least one option (Year, Make, or Model)');
    return;
  }

  // Create query string
  const queryParams = new URLSearchParams();
  if (year) queryParams.append('year', year);
  if (make) queryParams.append('make', make);
  if (model) queryParams.append('model', model);

  // Navigate to products page with query parameters
  window.location.href = `productss.html?${queryParams.toString()}`;
});

// Allow Enter key to trigger search
[yearSelect, makeSelect, modelSelect].forEach(select => {
  select.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
});

// ============ PRODUCT LOADING (for products page) ============

async function loadProducts() {
  try {
    // Load inventory
    const response = await fetch('../Models/inventory.json');
    const inventory = await response.json();

    // Load vans database if not already loaded
    if (vansDatabase.length === 0) {
      const vansResponse = await fetch('../Models/vans.json');
      const vansData = await vansResponse.json();
      const passengerMinivans = ['Odyssey', 'Sienna', 'Voyager'];
      vansDatabase = vansData.vans.filter(van => !passengerMinivans.includes(van.model));
    }

    // Collect all products from all categories
    Object.keys(inventory).forEach(categoryKey => {
      const products = inventory[categoryKey];
      allProducts = allProducts.concat(products.map(p => ({...p, category: categoryKey})));
    });

    // Check URL parameters for van selection
    const urlParams = new URLSearchParams(window.location.search);
    const year = urlParams.get('year');
    const make = urlParams.get('make');
    const model = urlParams.get('model');

    if (year || make || model) {
      // Filter products for the selected van
      const vanSpecs = {};
      if (year) vanSpecs.year = parseInt(year);
      if (make) vanSpecs.make = make;
      if (model) vanSpecs.model = model;

      filteredProducts = getCompatibleProducts(vansDatabase, inventory, vanSpecs);
      baseFilteredProducts = [...filteredProducts];

      // Display selected van info
      displayVanInfo(year, make, model);
    } else {
      // No van selected, show all products
      filteredProducts = [...allProducts];
      baseFilteredProducts = [...allProducts];
    }

    // Populate filters
    populateBrandFilter(inventory);
    populateCategoryFilter(inventory);

    // Setup event listeners and display
    setupEventListeners();
    displayProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function displayVanInfo(year, make, model) {
  const vanInfo = document.createElement('div');
  vanInfo.id = 'van-info';
  vanInfo.style.cssText = `
    background: #f0f8ff;
    border: 1px solid #007bff;
    border-radius: 5px;
    padding: 10px;
    margin-bottom: 20px;
    text-align: center;
    font-weight: bold;
  `;
  vanInfo.innerHTML = `Showing products for: ${year || 'Any Year'} ${make || 'Any Make'} ${model || 'Any Model'}`;
  const container = document.querySelector('.product-controls');
  if (container) {
    container.insertBefore(vanInfo, container.firstChild);
  }
}

function populateBrandFilter(inventory) {
  const brands = getAllBrands(inventory);
  const brandSelect = document.getElementById('brand-filter');
  if (brandSelect) {
    brandSelect.innerHTML = '<option value="">All Brands</option>';
    brands.forEach(brand => {
      const option = document.createElement('option');
      option.value = brand;
      option.textContent = brand;
      brandSelect.appendChild(option);
    });
  }
}

function populateCategoryFilter(inventory) {
  const categories = getAllCategories(inventory);
  const categorySelect = document.getElementById('category-filter');
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category.replace(/_/g, ' ').toUpperCase();
      categorySelect.appendChild(option);
    });
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('product-search');
  const categoryFilter = document.getElementById('category-filter');
  const brandFilter = document.getElementById('brand-filter');
  const priceFilter = document.getElementById('price-filter');
  const stockFilter = document.getElementById('stock-filter');
  const sortSelect = document.getElementById('sort-select');
  const clearFiltersBtn = document.getElementById('clear-filters');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
  if (brandFilter) brandFilter.addEventListener('change', applyFilters);
  if (priceFilter) priceFilter.addEventListener('change', applyFilters);
  if (stockFilter) stockFilter.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);
  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
}

function applyFilters() {
  const searchTerm = document.getElementById('product-search')?.value.toLowerCase() || '';
  const category = document.getElementById('category-filter')?.value || '';
  const brand = document.getElementById('brand-filter')?.value || '';
  const priceRange = document.getElementById('price-filter')?.value || '';
  const stock = document.getElementById('stock-filter')?.value || '';
  const sort = document.getElementById('sort-select')?.value || 'random';

  filteredProducts = baseFilteredProducts.filter(product => {
    // Search filter
    if (searchTerm && !product.part_description.toLowerCase().includes(searchTerm) &&
        !product.part_number.toLowerCase().includes(searchTerm)) {
      return false;
    }

    // Category filter
    if (category && product.category !== category) return false;

    // Brand filter
    if (brand && product.brand !== brand) return false;

    // Price filter
    if (priceRange) {
      const price = product.retail_price;
      const [min, max] = priceRange.split('-').map(p => parseInt(p));
      if (max) {
        if (price < min || price > max) return false;
      } else {
        if (price < min) return false;
      }
    }

    // Stock filter
    if (stock === 'in-stock' && product.quantity_on_hand === 0) return false;
    if (stock === 'out-of-stock' && product.quantity_on_hand > 0) return false;

    return true;
  });

  // Apply sorting
  switch(sort) {
    case 'price-low':
      filteredProducts.sort((a, b) => a.retail_price - b.retail_price);
      break;
    case 'price-high':
      filteredProducts.sort((a, b) => b.retail_price - a.retail_price);
      break;
    case 'name':
      filteredProducts.sort((a, b) => a.part_description.localeCompare(b.part_description));
      break;
    case 'random':
      filteredProducts.sort(() => Math.random() - 0.5);
      break;
  }

  currentPage = 1;
  displayProducts();
}

function clearFilters() {
  const searchInput = document.getElementById('product-search');
  const categoryFilter = document.getElementById('category-filter');
  const brandFilter = document.getElementById('brand-filter');
  const priceFilter = document.getElementById('price-filter');
  const stockFilter = document.getElementById('stock-filter');
  const sortSelect = document.getElementById('sort-select');

  if (searchInput) searchInput.value = '';
  if (categoryFilter) categoryFilter.value = '';
  if (brandFilter) brandFilter.value = '';
  if (priceFilter) priceFilter.value = '';
  if (stockFilter) stockFilter.value = '';
  if (sortSelect) sortSelect.value = 'random';
  
  currentPage = 1;
  filteredProducts = [...baseFilteredProducts];
  displayProducts();
}

function displayProducts() {
  const container = document.getElementById('product-categories');
  if (!container) return;

  container.innerHTML = '';
  
  const start = (currentPage - 1) * productsPerPage;
  const end = start + productsPerPage;
  const paginatedProducts = filteredProducts.slice(start, end);
  
  if (paginatedProducts.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No products found matching your criteria.</p>';
    const pagination = document.getElementById('pagination');
    if (pagination) pagination.innerHTML = '';
    return;
  }
  
  paginatedProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const isInWishlist = wishlist.some(w => w.part_number === product.part_number);
    
    const totalJobPrice = calculateJobPrice(product.retail_price, product.labor_hours).toFixed(2);
    
    card.innerHTML = `
      <div class="product-image">
        <img src="../Images/product-placeholder.jpg" alt="${product.part_description}" 
             onerror="this.src='../Images/van-shelves.jpg'" loading="lazy">
        <span class="brand-badge">${product.brand}</span>
        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" data-part-number="${product.part_number}" title="Add to Wishlist">
          <i class="fas fa-heart"></i>
        </button>
        <button class="quick-view-btn" data-product='${JSON.stringify(product)}'>Quick View</button>
      </div>
      <div class="product-info">
        <div class="product-rating">
          <div class="stars">★★★★★</div>
          <span class="rating-count">(24 reviews)</span>
        </div>
        <h3>${product.part_description}</h3>
        <p class="part-number">Part: ${product.part_number}</p>
        <p class="vehicle-fit">${product.vehicle_fitment}</p>
        <div class="product-pricing">
          <div class="price-item">
            <span class="label">Retail:</span>
            <span class="price">$${product.retail_price.toFixed(2)}</span>
          </div>
          <div class="price-item">
            <span class="label">Labor Hours:</span>
            <span class="hours">${product.labor_hours}h</span>
          </div>
          <div class="price-item total">
            <span class="label">Total Job:</span>
            <span class="price">$${totalJobPrice}</span>
          </div>
        </div>
        <p class="stock-status ${product.quantity_on_hand > 0 ? 'in-stock' : 'out-of-stock'}">
          ${product.quantity_on_hand > 0 ? `In Stock (${product.quantity_on_hand})` : 'Out of Stock'}
        </p>
        <button class="add-to-cart" ${product.quantity_on_hand === 0 ? 'disabled' : ''}>Add to Cart</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  // Add event listeners
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', toggleWishlist);
  });
  
  document.querySelectorAll('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', openQuickView);
  });
  
  displayPagination();
}

function toggleWishlist(e) {
  e.preventDefault();
  const partNumber = e.currentTarget.dataset.partNumber;
  const product = allProducts.find(p => p.part_number === partNumber);
  
  const index = wishlist.findIndex(w => w.part_number === partNumber);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(product);
  }
  
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  e.currentTarget.classList.toggle('active');
}

function openQuickView(e) {
  const product = JSON.parse(e.currentTarget.dataset.product);
  const totalJobPrice = calculateJobPrice(product.retail_price, product.labor_hours).toFixed(2);
  
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <div class="quick-view-content">
      <img src="../Images/van-shelves.jpg" alt="${product.part_description}" class="quick-view-image">
      <div class="quick-view-info">
        <span class="brand-badge">${product.brand}</span>
        <h2>${product.part_description}</h2>
        <p class="part-number">Part Number: ${product.part_number}</p>
        <div class="stars">★★★★★ <span>(24 reviews)</span></div>
        <p class="vehicle-fit"><strong>Vehicle Fitment:</strong> ${product.vehicle_fitment}</p>
        <div class="product-pricing">
          <div class="price-item">
            <span class="label">Retail Price:</span>
            <span class="price">$${product.retail_price.toFixed(2)}</span>
          </div>
          <div class="price-item">
            <span class="label">Labor Hours:</span>
            <span class="hours">${product.labor_hours}h</span>
          </div>
          <div class="price-item total">
            <span class="label">Total Job Price:</span>
            <span class="price">$${totalJobPrice}</span>
          </div>
        </div>
        <p class="stock-status ${product.quantity_on_hand > 0 ? 'in-stock' : 'out-of-stock'}">
          ${product.quantity_on_hand > 0 ? `In Stock (${product.quantity_on_hand})` : 'Out of Stock'}
        </p>
        <button class="add-to-cart-modal" ${product.quantity_on_hand === 0 ? 'disabled' : ''}>Add to Cart</button>
      </div>
    </div>
  `;
  
  const modal = document.getElementById('quickViewModal');
  if (modal) modal.style.display = 'block';
}

function displayPagination() {
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginationDiv = document.getElementById('pagination');
  if (!paginationDiv) return;

  paginationDiv.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationDiv.appendChild(prevBtn);
  
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      displayProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(btn);
  }
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationDiv.appendChild(nextBtn);
}

// Modal functionality
const modal = document.getElementById('quickViewModal');
const closeBtn = document.querySelector('.close');

if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    if (modal) modal.style.display = 'none';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the home page or products page
  const isProductsPage = document.getElementById('product-categories');
  
  if (isProductsPage) {
    // Load products for products page
    loadProducts();
  } else {
    // Load van selector for home page
    loadVansDatabase();
  }
});
    if (year || make || model) {
      // Filter products for the selected van
      const vanSpecs = {};
      if (year) vanSpecs.year = parseInt(year);
      if (make) vanSpecs.make = make;
      if (model) vanSpecs.model = model;

      filteredProducts = getCompatibleProducts(vansDatabase, inventory, vanSpecs);
      baseFilteredProducts = [...filteredProducts];
    } else {
      // No van selected, show all products
      filteredProducts = [...allProducts];
      baseFilteredProducts = [...allProducts];
    }

    // Populate brand filter with unique brands using helper function
    const brands = getAllBrands(inventory);
    const brandSelect = document.getElementById('brand-filter');
    if (brandSelect) {
      brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandSelect.appendChild(option);
      });
    }

    // Populate category filter
    const categories = getAllCategories(inventory);
    const categorySelect = document.getElementById('category-filter');
    if (categorySelect) {
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.replace(/_/g, ' ').toUpperCase();
        categorySelect.appendChild(option);
      });
    }

    // Setup event listeners and display
    setupEventListeners();
    displayProducts();

    // Display selected van info if applicable
    if (year || make || model) {
      const vanInfo = document.createElement('div');
      vanInfo.id = 'van-info';
      vanInfo.style.cssText = `
        background: #f0f8ff;
        border: 1px solid #007bff;
        border-radius: 5px;
        padding: 10px;
        margin-bottom: 20px;
        text-align: center;
        font-weight: bold;
      `;
      vanInfo.innerHTML = `Showing products for: ${year || 'Any Year'} ${make || 'Any Make'} ${model || 'Any Model'}`;
      const container = document.querySelector('.product-controls');
      if (container) {
        container.insertBefore(vanInfo, container.firstChild);
      }
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function setupEventListeners() {
  document.getElementById('product-search').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  document.getElementById('brand-filter').addEventListener('change', applyFilters);
  document.getElementById('price-filter').addEventListener('change', applyFilters);
  document.getElementById('stock-filter').addEventListener('change', applyFilters);
  document.getElementById('sort-select').addEventListener('change', applyFilters);
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
}

function applyFilters() {
  const searchTerm = document.getElementById('product-search').value.toLowerCase();
  const category = document.getElementById('category-filter').value;
  const brand = document.getElementById('brand-filter').value;
  const priceRange = document.getElementById('price-filter').value;
  const stock = document.getElementById('stock-filter').value;
  const sort = document.getElementById('sort-select').value;

  filteredProducts = baseFilteredProducts.filter(product => {
    // Search filter
    if (searchTerm && !product.part_description.toLowerCase().includes(searchTerm) &&
        !product.part_number.toLowerCase().includes(searchTerm)) {
      return false;
    }

    // Category filter
    if (category && product.category !== category) return false;

    // Brand filter
    if (brand && product.brand !== brand) return false;

    // Price filter
    if (priceRange) {
      const price = product.retail_price;
      const [min, max] = priceRange.split('-').map(p => parseInt(p));
      if (max) {
        if (price < min || price > max) return false;
      } else {
        if (price < min) return false;
      }
    }

    // Stock filter
    if (stock === 'in-stock' && product.quantity_on_hand === 0) return false;
    if (stock === 'out-of-stock' && product.quantity_on_hand > 0) return false;

    return true;
  });

  // Apply sorting
  switch(sort) {
    case 'price-low':
      filteredProducts.sort((a, b) => a.retail_price - b.retail_price);
      break;
    case 'price-high':
      filteredProducts.sort((a, b) => b.retail_price - a.retail_price);
      break;
    case 'name':
      filteredProducts.sort((a, b) => a.part_description.localeCompare(b.part_description));
      break;
    case 'random':
      filteredProducts.sort(() => Math.random() - 0.5);
      break;
  }

  currentPage = 1;
  displayProducts();
}

function clearFilters() {
  document.getElementById('product-search').value = '';
  document.getElementById('category-filter').value = '';
  document.getElementById('brand-filter').value = '';
  document.getElementById('price-filter').value = '';
  document.getElementById('stock-filter').value = '';
  document.getElementById('sort-select').value = 'random';
  currentPage = 1;
  filteredProducts = [...baseFilteredProducts];
  displayProducts();
}

function displayProducts() {
  const container = document.getElementById('product-categories');
  container.innerHTML = '';
  
  const start = (currentPage - 1) * productsPerPage;
  const end = start + productsPerPage;
  const paginatedProducts = filteredProducts.slice(start, end);
  
  if (paginatedProducts.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No products found matching your criteria.</p>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  paginatedProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const isInWishlist = wishlist.some(w => w.part_number === product.part_number);
    
    const totalJobPrice = calculateJobPrice(product.retail_price, product.labor_hours).toFixed(2);
    
    card.innerHTML = `
      <div class="product-image">
        <img src="../Images/product-placeholder.jpg" alt="${product.part_description}" 
             onerror="this.src='../Images/van-shelves.jpg'" loading="lazy">
        <span class="brand-badge">${product.brand}</span>
        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" data-part-number="${product.part_number}" title="Add to Wishlist">
          <i class="fas fa-heart"></i>
        </button>
        <button class="quick-view-btn" data-product='${JSON.stringify(product)}'>Quick View</button>
      </div>
      <div class="product-info">
        <div class="product-rating">
          <div class="stars">★★★★★</div>
          <span class="rating-count">(24 reviews)</span>
        </div>
        <h3>${product.part_description}</h3>
        <p class="part-number">Part: ${product.part_number}</p>
        <p class="vehicle-fit">${product.vehicle_fitment}</p>
        <div class="product-pricing">
          <div class="price-item">
            <span class="label">Retail:</span>
            <span class="price">$${product.retail_price.toFixed(2)}</span>
          </div>
          <div class="price-item">
            <span class="label">Labor Hours:</span>
            <span class="hours">${product.labor_hours}h</span>
          </div>
          <div class="price-item total">
            <span class="label">Total Job:</span>
            <span class="price">$${totalJobPrice}</span>
          </div>
        </div>
        <p class="stock-status ${product.quantity_on_hand > 0 ? 'in-stock' : 'out-of-stock'}">
          ${product.quantity_on_hand > 0 ? `In Stock (${product.quantity_on_hand})` : 'Out of Stock'}
        </p>
        <button class="add-to-cart" ${product.quantity_on_hand === 0 ? 'disabled' : ''}>Add to Cart</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  // Add event listeners
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', toggleWishlist);
  });
  
  document.querySelectorAll('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', openQuickView);
  });
  
  displayPagination();
}

function toggleWishlist(e) {
  e.preventDefault();
  const partNumber = e.currentTarget.dataset.partNumber;
  const product = allProducts.find(p => p.part_number === partNumber);
  
  const index = wishlist.findIndex(w => w.part_number === partNumber);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(product);
  }
  
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  e.currentTarget.classList.toggle('active');
}

function openQuickView(e) {
  const product = JSON.parse(e.currentTarget.dataset.product);
  const totalJobPrice = calculateJobPrice(product.retail_price, product.labor_hours).toFixed(2);
  
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <div class="quick-view-content">
      <img src="../Images/van-shelves.jpg" alt="${product.part_description}" class="quick-view-image">
      <div class="quick-view-info">
        <span class="brand-badge">${product.brand}</span>
        <h2>${product.part_description}</h2>
        <p class="part-number">Part Number: ${product.part_number}</p>
        <div class="stars">★★★★★ <span>(24 reviews)</span></div>
        <p class="vehicle-fit"><strong>Vehicle Fitment:</strong> ${product.vehicle_fitment}</p>
        <div class="product-pricing">
          <div class="price-item">
            <span class="label">Retail Price:</span>
            <span class="price">$${product.retail_price.toFixed(2)}</span>
          </div>
          <div class="price-item">
            <span class="label">Labor Hours:</span>
            <span class="hours">${product.labor_hours}h</span>
          </div>
          <div class="price-item total">
            <span class="label">Total Job Price:</span>
            <span class="price">$${totalJobPrice}</span>
          </div>
        </div>
        <p class="stock-status ${product.quantity_on_hand > 0 ? 'in-stock' : 'out-of-stock'}">
          ${product.quantity_on_hand > 0 ? `In Stock (${product.quantity_on_hand})` : 'Out of Stock'}
        </p>
        <button class="add-to-cart-modal" ${product.quantity_on_hand === 0 ? 'disabled' : ''}>Add to Cart</button>
      </div>
    </div>
  `;
  
  document.getElementById('quickViewModal').style.display = 'block';
}

function displayPagination() {
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginationDiv = document.getElementById('pagination');
  paginationDiv.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationDiv.appendChild(prevBtn);
  
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      displayProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(btn);
  }
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationDiv.appendChild(nextBtn);
}

// Modal functionality
const modal = document.getElementById('quickViewModal');
const closeBtn = document.querySelector('.close');

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Initialize products on page load
document.addEventListener('DOMContentLoaded', loadProducts);

// Van Selector Logic with Dynamic Filtering
let vansDatabase = [];

const yearSelect = document.getElementById('year-select');
const makeSelect = document.getElementById('make-select');
const modelSelect = document.getElementById('model-select');
const searchBtn = document.getElementById('search-btn');

// Load vans database from JSON
async function loadVansDatabase() {
  try {
    const response = await fetch('../Models/vans.json');
    const data = await response.json();
    // Filter out passenger minivans - keep only cargo/commercial vans
    const passengerMinivans = ['Odyssey', 'Sienna', 'Voyager'];
    vansDatabase = data.vans.filter(van => !passengerMinivans.includes(van.model));
    populateYears();
  } catch (error) {
    console.error('Error loading vans database:', error);
    alert('Error loading van data. Please refresh the page.');
  }
}

// Populate years from database
function populateYears() {
  const years = getAvailableYears(vansDatabase);
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}

// Populate makes based on selected year
function populateMakes() {
  makeSelect.innerHTML = '<option value="">Select Make</option>';
  modelSelect.innerHTML = '<option value="">Select Model</option>';

  const selectedYear = parseInt(yearSelect.value);
  const makes = selectedYear ? getMakesForYear(vansDatabase, selectedYear) : 
                [...new Set(vansDatabase.map(van => van.make))].sort();

  makes.forEach(make => {
    const option = document.createElement('option');
    option.value = make;
    option.textContent = make;
    makeSelect.appendChild(option);
  });
}

// Populate models based on selected year and make
function populateModels() {
  modelSelect.innerHTML = '<option value="">Select Model</option>';

  const selectedYear = parseInt(yearSelect.value);
  const selectedMake = makeSelect.value;

  if (!selectedYear || !selectedMake) {
    const allModels = [...new Set(
      vansDatabase.filter(v => !selectedYear || v.year === selectedYear)
                  .filter(v => !selectedMake || v.make === selectedMake)
                  .map(v => v.model)
    )].sort();

    allModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
  } else {
    const models = getModelsForYearAndMake(vansDatabase, selectedYear, selectedMake);
    models.forEach(({ model, modelNumber }) => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = `${model} ${modelNumber}`;
      modelSelect.appendChild(option);
    });
  }
}

// Event listeners for dynamic filtering
yearSelect.addEventListener('change', populateMakes);
makeSelect.addEventListener('change', populateModels);

// Search functionality
searchBtn.addEventListener('click', function() {
  const year = yearSelect.value;
  const make = makeSelect.value;
  const model = modelSelect.value;

  // Validate that at least one option is selected
  if (!year && !make && !model) {
    alert('Please select at least one option (Year, Make, or Model)');
    return;
  }

  // Create query string
  const queryParams = new URLSearchParams();
  if (year) queryParams.append('year', year);
  if (make) queryParams.append('make', make);
  if (model) queryParams.append('model', model);

  // Navigate to products page with query parameters
  window.location.href = `productss.html?${queryParams.toString()}`;
});

// Allow Enter key to trigger search
[yearSelect, makeSelect, modelSelect].forEach(select => {
  select.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
});

// Initialize on page load
loadVansDatabase();

