// Cart Popover Functionality
document.addEventListener('DOMContentLoaded', function() {
  const cartTrigger = document.querySelector('.cart-trigger');
  const cartPopover = document.querySelector('.cart-popover');
  const cartPopoverOverlay = document.querySelector('.cart-popover-overlay');
  const cartPopoverClose = document.querySelector('.cart-popover-close');
  const clearCartBtn = document.querySelector('.clear-cart-btn');
  const checkoutBtn = document.querySelector('.checkout-btn');

  // Open cart popover
  if (cartTrigger) {
    cartTrigger.addEventListener('click', function(e) {
      e.preventDefault();
      openCartPopover();
    });
  }

  // Close cart popover
  if (cartPopoverClose) {
    cartPopoverClose.addEventListener('click', closeCartPopover);
  }

  if (cartPopoverOverlay) {
    cartPopoverOverlay.addEventListener('click', closeCartPopover);
  }

  // Clear cart
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', function() {
      localStorage.removeItem('cart');
      renderCartPopover();
    });
  }

  // Checkout button
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
      alert('Proceeding to checkout...');
      // This can be expanded to redirect to a checkout page or form
    });
  }

  function openCartPopover() {
    if (cartPopover) {
      cartPopover.classList.add('active');
      if (cartPopoverOverlay) cartPopoverOverlay.classList.add('active');
      renderCartPopover();
    }
  }

  function closeCartPopover() {
    if (cartPopover) {
      cartPopover.classList.remove('active');
      if (cartPopoverOverlay) cartPopoverOverlay.classList.remove('active');
    }
  }

  function renderCartPopover() {
    const contents = document.querySelector('.cart-popover-contents');
    const footerTotal = document.querySelector('.cart-popover-total');
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    if (!cart.length) {
      contents.innerHTML = '<div class="cart-popover-empty"><p>Your shopping cart is empty.</p></div>';
      if (footerTotal) footerTotal.innerHTML = '<span>Total:</span><span>$0.00</span>';
      if (checkoutBtn) checkoutBtn.disabled = true;
      if (clearCartBtn) clearCartBtn.disabled = true;
      return;
    }

    contents.innerHTML = cart.map((item, idx) => {
      const laborCost = (item.laborHours || 0) * (item.laborRate || 0);
      const itemTotal = ((item.price || 0) + laborCost) * item.qty;
      return `
      <div class="cart-item" data-idx="${idx}">
        <h4>${item.title}</h4>
        <div class="cart-item-details">SKU: ${item.id}</div>
        <div class="cart-item-details">Qty: ${item.qty}</div>
        <div class="cart-item-details">Retail: $${(item.price || 0).toFixed(2)}</div>
        ${item.laborHours ? `<div class="cart-item-details">Labor: ${item.laborHours}h @ $${(item.laborRate||0).toFixed(2)}/h = $${laborCost.toFixed(2)}</div>` : ''}
        <div class="cart-item-details" style="font-weight: 600;">Subtotal: $${itemTotal.toFixed(2)}</div>
        <button class="cart-item-remove" data-idx="${idx}">Remove</button>
      </div>
    `;
    }).join('');

    // Add remove event listeners
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.idx);
        if (!isNaN(idx)) {
          cart.splice(idx, 1);
          localStorage.setItem('cart', JSON.stringify(cart));
          renderCartPopover();
        }
      });
    });

    // Calculate total
    const total = cart.reduce((sum, item) => {
      const laborCost = (item.laborHours || 0) * (item.laborRate || 0);
      return sum + (((item.price || 0) + laborCost) * item.qty);
    }, 0);
    if (footerTotal) footerTotal.innerHTML = `<span>Total:</span><span>$${total.toFixed(2)}</span>`;
    
    // Enable buttons
    if (checkoutBtn) checkoutBtn.disabled = false;
    if (clearCartBtn) clearCartBtn.disabled = false;
  }

  // Initial render
  renderCartPopover();
});
