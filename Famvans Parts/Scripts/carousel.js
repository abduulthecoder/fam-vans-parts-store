let allProducts = [];

// Fetch inventory data from JSON file
async function loadInventory() {
    try {
        const response = await fetch('../Models/inventory.json');
        const data = await response.json();
        
        // Extract all products from all categories
        allProducts = [];
        for (const category in data.inventory) {
            if (Array.isArray(data.inventory[category])) {
                allProducts.push(...data.inventory[category]);
            }
        }
        
        // Initialize all 4 carousels with different product ranges
        initCarousels();
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function createProductCard(product) {
    const price = product.retail_price ? `$${product.retail_price.toFixed(2)}` : 'N/A';
    const fitment = product.vehicle_fitment || 'Vehicle fitment info not available';
    
    return `
        <div class="product-card carousel-product">
            <div class="product-image">
                <div class="product-image-placeholder">
                    <i class="fas fa-box"></i>
                </div>
                <div class="brand-badge">${product.brand}</div>
            </div>
            <div class="product-info">
                <h3>${product.part_description}</h3>
                <div class="part-number">Part #: ${product.part_number}</div>
                <div class="product-fitment-text">${fitment}</div>
                <div class="product-pricing">
                    <span class="price">${price}</span>
                </div>
            </div>
        </div>
    `;
}

function initCarousels() {
    // Carousel 1: Products 0-9
    populateCarousel('carousel1', allProducts.slice(0, 10));
    
    // Carousel 2: Products 10-19
    populateCarousel('carousel2', allProducts.slice(10, 20));
    
    // Carousel 3: Products 20-29
    populateCarousel('carousel3', allProducts.slice(20, 30));
    
    // Carousel 4: Products 30-39
    populateCarousel('carousel4', allProducts.slice(30, 40));
}

function populateCarousel(elementId, products) {
    const track = document.getElementById(elementId);
    if (!track || products.length === 0) return;
    
    let html = '';
    
    // Create the products twice for seamless looping
    for (let i = 0; i < 2; i++) {
        products.forEach(product => {
            html += createProductCard(product);
        });
    }
    
    track.innerHTML = html;
}

// Load inventory when page loads
document.addEventListener('DOMContentLoaded', loadInventory);