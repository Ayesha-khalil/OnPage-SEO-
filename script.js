// --- Navigation & Mobile Menu ---
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "✕" : "☰";
  });

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "☰";
    });
  });
}

// --- Reservation Form ---
const dateInput = document.querySelector("#booking-date");
const bookingForm = document.querySelector("#booking-form");
if (dateInput && bookingForm) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().split("T")[0];
  dateInput.min = localToday;

  bookingForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector("#form-message");
    const booking = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      date: form.get("date"),
      guests: form.get("guests")
    };

    // Format the date nicely
    const dateObj = new Date(booking.date + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Generate a booking reference
    const bookingRef = "RES-" + String(Math.floor(1000 + Math.random() * 9000));

    // Build confirmation details
    const detailsEl = document.getElementById("booking-confirm-details");
    detailsEl.innerHTML = `
      <div class="bcd-row"><span class="bcd-label">Booking Ref</span><span class="bcd-value" style="color:#a98754;font-size:16px;font-weight:700">${bookingRef}</span></div>
      <div class="bcd-row"><span class="bcd-label">Guest Name</span><span class="bcd-value">${booking.name}</span></div>
      <div class="bcd-row"><span class="bcd-label">Email</span><span class="bcd-value">${booking.email}</span></div>
      <div class="bcd-row"><span class="bcd-label">Phone</span><span class="bcd-value">${booking.phone}</span></div>
      <div class="bcd-row"><span class="bcd-label">Date</span><span class="bcd-value">${formattedDate}</span></div>
      <div class="bcd-row"><span class="bcd-label">Guests</span><span class="bcd-value">${booking.guests}</span></div>
    `;

    // Show the overlay
    const overlay = document.getElementById("booking-overlay");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    // Close handler
    const closeBtn = document.getElementById("booking-confirm-close");
    const closeOverlay = () => {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    };
    closeBtn.onclick = closeOverlay;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeOverlay(); }, { once: true });

    // Also set the small text message
    message.textContent = `Thank you, ${booking.name}! Your reservation ${bookingRef} has been requested.`;
    event.currentTarget.reset();
    dateInput.min = localToday;
  });
}

// --- Menu Category Filtering ---
const menuTabs = document.querySelectorAll(".menu-tab-btn");
const dishCards = document.querySelectorAll(".dish-card");

menuTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    menuTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const filter = tab.getAttribute("data-filter");

    dishCards.forEach(card => {
      const category = card.getAttribute("data-category");
      if (filter === "all" || category === filter) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    });
  });
});

// ==========================================
// --- ORDERING SYSTEM: DINE-IN / TAKEAWAY & CART ---
// ==========================================

let orderMode = "dine-in"; // "dine-in" or "takeaway"
let paymentMethod = "cash"; // "cash" or "card"
let cart = [];

// Load state from localStorage
try {
  const savedCart = localStorage.getItem("saffron_cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
  }
  const savedMode = localStorage.getItem("saffron_order_mode");
  if (savedMode) {
    orderMode = savedMode;
  }
  const savedPay = localStorage.getItem("saffron_pay_method");
  if (savedPay) {
    paymentMethod = savedPay;
  }
} catch (e) {
  console.warn("Storage not available:", e);
}

// Currency Formatter
function formatRs(amount) {
  return "Rs. " + Number(amount).toLocaleString();
}

// Save state
function persistCart() {
  try {
    localStorage.setItem("saffron_cart", JSON.stringify(cart));
    localStorage.setItem("saffron_order_mode", orderMode);
    localStorage.setItem("saffron_pay_method", paymentMethod);
  } catch (e) {}
}

// DOM Elements
const cartOverlay = document.getElementById("cart-overlay");
const cartDrawer = document.getElementById("cart-drawer");
const cartCloseBtn = document.getElementById("close-cart-btn");
const cartItemsContainer = document.getElementById("cart-items-container");
const billSubtotal = document.getElementById("bill-subtotal");
const billTotal = document.getElementById("bill-total");
const placeOrderBtn = document.getElementById("place-order-btn");
const checkoutBtnText = document.getElementById("checkout-btn-text");
const clearCartBtn = document.getElementById("clear-cart-btn");
const cartModeLabel = document.getElementById("cart-mode-label");
const dineInDetails = document.getElementById("dine-in-details");
const takeawayDetails = document.getElementById("takeaway-details");

// Badges & Counters
const headerCartCount = document.getElementById("header-cart-count");
const floatingCartBar = document.getElementById("floating-cart-bar");
const fcCount = document.getElementById("fc-count");
const fcTotal = document.getElementById("fc-total");
const fcModeBadge = document.getElementById("fc-mode-badge");

// Trigger buttons
const openCartHeader = document.getElementById("open-cart-header");
const openCartFloating = document.getElementById("open-cart-floating");
const openCartTriggers = document.querySelectorAll(".open-cart-trigger");

// Mode buttons
const modeBtnDine = document.getElementById("mode-btn-dine");
const modeBtnTakeaway = document.getElementById("mode-btn-takeaway");
const cartTabDine = document.getElementById("cart-tab-dine");
const cartTabTakeaway = document.getElementById("cart-tab-takeaway");

// Payment Method Elements
const payBtnCash = document.getElementById("pay-btn-cash");
const payBtnCard = document.getElementById("pay-btn-card");
const payActiveText = document.getElementById("pay-active-text");
const payCashSub = document.getElementById("pay-cash-sub");
const payCardSub = document.getElementById("pay-card-sub");

// Receipt Modal Elements
const receiptOverlay = document.getElementById("receipt-overlay");
const receiptCard = document.getElementById("receipt-card");
const receiptTopClose = document.getElementById("receipt-top-close");
const closeReceiptBtn = document.getElementById("close-receipt-btn");
const printReceiptBtn = document.getElementById("print-receipt-btn");
const viewBillBtn = document.getElementById("view-bill-btn");
const viewCompactBtn = document.getElementById("view-compact-btn");

// Mode Switching function
function setOrderMode(mode) {
  orderMode = mode;
  persistCart();

  if (mode === "dine-in") {
    modeBtnDine?.classList.add("active");
    modeBtnTakeaway?.classList.remove("active");
    cartTabDine?.classList.add("active");
    cartTabTakeaway?.classList.remove("active");

    if (dineInDetails) dineInDetails.style.display = "flex";
    if (takeawayDetails) takeawayDetails.style.display = "none";
    if (cartModeLabel) cartModeLabel.textContent = "Dine-In";
    if (fcModeBadge) fcModeBadge.textContent = "🍽️ Dine-In";
    if (payCashSub) payCashSub.textContent = "Standard Bill (No Discount)";
    if (payCardSub) payCardSub.textContent = "Save 10% with Card at table";
  } else {
    modeBtnTakeaway?.classList.add("active");
    modeBtnDine?.classList.remove("active");
    cartTabTakeaway?.classList.add("active");
    cartTabDine?.classList.remove("active");

    if (dineInDetails) dineInDetails.style.display = "none";
    if (takeawayDetails) takeawayDetails.style.display = "flex";
    if (cartModeLabel) cartModeLabel.textContent = "Takeaway";
    if (fcModeBadge) fcModeBadge.textContent = "🛍️ Takeaway";
    if (payCashSub) payCashSub.textContent = "Standard Bill on pickup";
    if (payCardSub) payCardSub.textContent = "Save 10% with Card on pickup";
  }

  renderCart();
}

// Wire Mode Switch events
modeBtnDine?.addEventListener("click", () => setOrderMode("dine-in"));
modeBtnTakeaway?.addEventListener("click", () => setOrderMode("takeaway"));
cartTabDine?.addEventListener("click", () => setOrderMode("dine-in"));
cartTabTakeaway?.addEventListener("click", () => setOrderMode("takeaway"));

// Payment Method Switcher (with Live 10% Discount calculation!)
function setPaymentMethod(method) {
  paymentMethod = method;
  persistCart();

  if (method === "cash") {
    payBtnCash?.classList.add("active");
    payBtnCard?.classList.remove("active");
    if (payActiveText) payActiveText.textContent = "💵 Cash (Standard)";
  } else {
    payBtnCard?.classList.add("active");
    payBtnCash?.classList.remove("active");
    if (payActiveText) payActiveText.textContent = "💳 Card (10% Discount Applied)";
  }

  renderCart();
}

payBtnCash?.addEventListener("click", () => setPaymentMethod("cash"));
payBtnCard?.addEventListener("click", () => setPaymentMethod("card"));

// Receipt View Toggle (Standard vs Compact Slip)
viewBillBtn?.addEventListener("click", () => {
  viewBillBtn.classList.add("active");
  viewCompactBtn?.classList.remove("active");
  receiptCard?.classList.remove("compact-view");
});

viewCompactBtn?.addEventListener("click", () => {
  viewCompactBtn.classList.add("active");
  viewBillBtn?.classList.remove("active");
  receiptCard?.classList.add("compact-view");
});

// Open/Close Cart
function openCart() {
  cartOverlay?.classList.add("open");
  cartDrawer?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartOverlay?.classList.remove("open");
  cartDrawer?.classList.remove("open");
  document.body.style.overflow = "";
}

openCartHeader?.addEventListener("click", openCart);
openCartFloating?.addEventListener("click", openCart);
cartCloseBtn?.addEventListener("click", closeCart);
cartOverlay?.addEventListener("click", closeCart);
openCartTriggers.forEach(btn => btn.addEventListener("click", openCart));

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeCart();
    closeReceipt();
  }
});

// Toast notification
function showToast(text, icon = "✓") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// Add Item to Cart
function addToCart(dish) {
  const existing = cart.find(item => item.id === dish.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: dish.id,
      name: dish.name,
      price: Number(dish.price),
      img: dish.img,
      category: dish.category || "General",
      qty: 1
    });
  }
  persistCart();
  renderCart();
  showToast(`Added ${dish.name} to tray!`);
}

// Update Quantity
function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  persistCart();
  renderCart();
}

// Remove Item
function removeItem(id) {
  const item = cart.find(i => i.id === id);
  if (item) {
    cart = cart.filter(i => i.id !== id);
    persistCart();
    renderCart();
    showToast(`Removed ${item.name}`, "🗑️");
  }
}

// Clear Cart
clearCartBtn?.addEventListener("click", () => {
  if (cart.length === 0) return;
  if (confirm("Are you sure you want to empty your order tray?")) {
    cart = [];
    persistCart();
    renderCart();
    showToast("Your order tray has been emptied.");
  }
});

// Calculate Totals (includes 10% Card Discount calculation)
function getCartTotals() {
  const totalCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  
  // 10% discount when paying by Card
  let discount = 0;
  if (paymentMethod === "card" && subtotal > 0) {
    discount = Math.round(subtotal * 0.10);
  }
  const total = Math.max(0, subtotal - discount);

  return { totalCount, subtotal, discount, total };
}

// Render Cart UI
function renderCart() {
  const { totalCount, subtotal, discount, total } = getCartTotals();

  // Badges & counters
  if (headerCartCount) headerCartCount.textContent = String(totalCount);
  if (fcCount) fcCount.textContent = String(totalCount);
  if (fcTotal) fcTotal.textContent = formatRs(total);

  // Bill Breakdown
  const billItemCount = document.getElementById("bill-item-count");
  if (billItemCount) billItemCount.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;
  if (billSubtotal) billSubtotal.textContent = formatRs(subtotal);

  const billDiscountRow = document.getElementById("bill-discount-row");
  const billDiscount = document.getElementById("bill-discount");

  if (discount > 0) {
    if (billDiscountRow) billDiscountRow.style.display = "flex";
    if (billDiscount) billDiscount.textContent = `- ${formatRs(discount)} (10% OFF)`;
  } else {
    if (billDiscountRow) billDiscountRow.style.display = "none";
  }

  if (billTotal) billTotal.textContent = formatRs(total);

  // Update checkout button text with dynamic total
  if (checkoutBtnText) {
    if (orderMode === "dine-in") {
      checkoutBtnText.textContent = totalCount > 0 ? `Place Dine-In Order (${formatRs(total)})` : "Place Dine-In Order";
    } else {
      checkoutBtnText.textContent = totalCount > 0 ? `Confirm Takeaway Order (${formatRs(total)})` : "Confirm Takeaway Order";
    }
  }

  // Floating Action Bar visibility
  if (floatingCartBar) {
    if (totalCount > 0) {
      floatingCartBar.style.display = "block";
      floatingCartBar.style.opacity = "1";
    } else {
      floatingCartBar.style.display = "none";
    }
  }

  // Items container
  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <span class="empty-icon">🍽️</span>
        <h4>Your tray is empty</h4>
        <p>Choose an item from the menu below or tap a popular dish to add it immediately:</p>
        <div class="quick-add-group">
          <button type="button" class="quick-chip-btn" data-id="desi-biryani" data-name="Special Dum Biryani" data-price="1450" data-img="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80">+ Special Biryani (Rs. 1,450)</button>
          <button type="button" class="quick-chip-btn" data-id="ff-smash-burger" data-name="Saffron Smash Burger" data-price="1350" data-img="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80">+ Smash Burger (Rs. 1,350)</button>
          <button type="button" class="quick-chip-btn" data-id="bev-saffron-latte" data-name="Signature Saffron Latte" data-price="650" data-img="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80">+ Saffron Latte (Rs. 650)</button>
        </div>
      </div>
    `;

    cartItemsContainer.querySelectorAll(".quick-chip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        addToCart({
          id: btn.getAttribute("data-id"),
          name: btn.getAttribute("data-name"),
          price: btn.getAttribute("data-price"),
          img: btn.getAttribute("data-img")
        });
      });
    });

    if (placeOrderBtn) placeOrderBtn.disabled = false;
    return;
  }

  if (placeOrderBtn) placeOrderBtn.disabled = false;

  let html = "";
  cart.forEach(item => {
    const lineTotal = item.price * item.qty;
    html += `
      <div class="cart-item-row" data-id="${item.id}">
        <img class="cart-item-img" src="${item.img}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-unit">${formatRs(item.price)} each</div>
          <div class="cart-item-stepper">
            <button class="step-btn step-minus" type="button" data-id="${item.id}">−</button>
            <span class="step-qty">${item.qty}</span>
            <button class="step-btn step-plus" type="button" data-id="${item.id}">+</button>
          </div>
        </div>
        <div class="cart-item-side">
          <span class="cart-item-line-total">${formatRs(lineTotal)}</span>
          <button class="cart-item-del-btn" type="button" data-id="${item.id}">Remove</button>
        </div>
      </div>
    `;
  });

  cartItemsContainer.innerHTML = html;

  // Stepper events
  cartItemsContainer.querySelectorAll(".step-minus").forEach(btn => {
    btn.addEventListener("click", () => updateQty(btn.getAttribute("data-id"), -1));
  });
  cartItemsContainer.querySelectorAll(".step-plus").forEach(btn => {
    btn.addEventListener("click", () => updateQty(btn.getAttribute("data-id"), 1));
  });
  cartItemsContainer.querySelectorAll(".cart-item-del-btn").forEach(btn => {
    btn.addEventListener("click", () => removeItem(btn.getAttribute("data-id")));
  });
}

// Attach Add to Cart clicks on dish cards
document.querySelectorAll(".add-cart-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    e.stopPropagation();
    const id = btn.getAttribute("data-id");
    const name = btn.getAttribute("data-name");
    const price = btn.getAttribute("data-price");
    const category = btn.getAttribute("data-category");
    const img = btn.getAttribute("data-img");

    addToCart({ id, name, price, category, img });

    const originalText = btn.innerHTML;
    btn.classList.add("added");
    btn.innerHTML = "✓ Added";
    setTimeout(() => {
      btn.classList.remove("added");
      btn.innerHTML = originalText;
    }, 1000);
  });
});

// Checkout & Place Order
placeOrderBtn?.addEventListener("click", () => {
  if (cart.length === 0) {
    showToast("⚠️ Your tray is empty! Add a dish to confirm your order.", "🍽️");
    closeCart();
    const menuSection = document.getElementById("menu");
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: "smooth" });
    }
    return;
  }

  let customerDetails = {};
  if (orderMode === "dine-in") {
    const tableSelect = document.getElementById("table-select");
    const guestName = document.getElementById("dine-guest-name")?.value.trim() || "Guest";
    const notes = document.getElementById("dine-notes")?.value.trim() || "";
    const chosenTable = (tableSelect && tableSelect.value) ? tableSelect.value : "Table 1";

    customerDetails = {
      orderId: "#TB-" + Math.floor(1000 + Math.random() * 9000),
      type: "Dine-In",
      target: chosenTable + (guestName !== "Guest" ? ` · ${guestName}` : ""),
      name: guestName,
      readyIn: "~20 mins at Table",
      notes: notes,
      payment: paymentMethod === "cash" 
        ? "💵 Cash (Pay at Table)" 
        : "💳 Card (10% Discount Applied — Wireless POS at Table)"
    };
  } else {
    // Takeaway ordering
    const nameInput = document.getElementById("takeaway-name");
    const phoneInput = document.getElementById("takeaway-phone");
    const timeSelect = document.getElementById("takeaway-time");
    const notesInput = document.getElementById("takeaway-notes");

    const customerName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : "Walk-in Guest";
    const customerPhone = (phoneInput && phoneInput.value.trim()) ? phoneInput.value.trim() : "Counter Pickup";
    const readyTime = (timeSelect && timeSelect.value) ? timeSelect.value : "ASAP (20–25 mins)";
    const notes = notesInput ? notesInput.value.trim() : "";

    customerDetails = {
      orderId: "#TK-" + Math.floor(1000 + Math.random() * 9000),
      type: "Takeaway",
      target: `Pickup by ${customerName} · ${customerPhone}`,
      name: customerName,
      phone: customerPhone,
      readyIn: readyTime,
      notes: notes,
      payment: paymentMethod === "cash" 
        ? "💵 Cash (Pay on Counter Pickup)" 
        : "💳 Card (10% Discount Applied — Counter POS Terminal)"
    };
  }

  // Visual confirmation feedback on the button
  const originalHtml = placeOrderBtn.innerHTML;
  placeOrderBtn.innerHTML = `<span>⏳ Confirming ${customerDetails.type} Order...</span>`;
  placeOrderBtn.style.opacity = "0.8";
  placeOrderBtn.style.pointerEvents = "none";

  setTimeout(() => {
    placeOrderBtn.innerHTML = originalHtml;
    placeOrderBtn.style.opacity = "1";
    placeOrderBtn.style.pointerEvents = "auto";
    showReceipt(customerDetails);
  }, 300);
});

// Receipt Modal display (WITH HIGH-RES FOOD PICTURES & DYNAMIC CARD DISCOUNT!)
function showReceipt(details) {
  const { subtotal, discount, total } = getCartTotals();
  const currentItems = [...cart];

  closeCart();

  const now = new Date();
  const timeString = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
                     " · " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Update receipt fields
  const ocbTitle = document.getElementById("ocb-title");
  const ocbDesc = document.getElementById("ocb-desc");
  const receiptStatus = document.getElementById("receipt-status");
  const receiptReadyTime = document.getElementById("receipt-ready-time");

  document.getElementById("receipt-order-id").textContent = details.orderId;
  document.getElementById("receipt-time").textContent = timeString;
  document.getElementById("receipt-mode").textContent = details.type;
  document.getElementById("receipt-target").textContent = details.target;
  document.getElementById("receipt-payment").textContent = details.payment;
  document.getElementById("receipt-subtotal").textContent = formatRs(subtotal);

  // Discount row in receipt
  const receiptDiscountRow = document.getElementById("receipt-discount-row");
  const receiptDiscount = document.getElementById("receipt-discount");
  if (discount > 0) {
    if (receiptDiscountRow) receiptDiscountRow.style.display = "flex";
    if (receiptDiscount) receiptDiscount.textContent = `- ${formatRs(discount)} (10% Card Discount)`;
  } else {
    if (receiptDiscountRow) receiptDiscountRow.style.display = "none";
  }

  document.getElementById("receipt-total").textContent = formatRs(total);

  if (details.type === "Takeaway") {
    if (ocbTitle) ocbTitle.textContent = "TAKEAWAY ORDER CONFIRMED!";
    if (ocbDesc) ocbDesc.textContent = `Your meal is in preparation! Please present Order Token ${details.orderId} at our pickup counter when you arrive.`;
    if (receiptStatus) receiptStatus.textContent = "Takeaway Confirmed & Preparing";
    if (receiptReadyTime) receiptReadyTime.textContent = details.readyIn;
    viewBillBtn?.click();
  } else {
    if (ocbTitle) ocbTitle.textContent = "DINE-IN ORDER CONFIRMED!";
    if (ocbDesc) ocbDesc.textContent = `Your order has been sent to our chef and will be served to ${details.target}.`;
    if (receiptStatus) receiptStatus.textContent = "Dine-In Confirmed & In Kitchen";
    if (receiptReadyTime) receiptReadyTime.textContent = "~20 mins at Table";
    viewCompactBtn?.click();
  }

  // Render items in receipt WITH FOOD PICTURES!
  const receiptList = document.getElementById("receipt-items-list");
  let itemsHtml = "";
  currentItems.forEach(item => {
    itemsHtml += `
      <div class="r-item-card">
        <img class="r-item-img" src="${item.img}" alt="${item.name}">
        <div class="r-item-info">
          <div class="r-item-name">${item.name}</div>
          <div class="r-item-sub">${formatRs(item.price)} each × <span class="r-item-qty-badge">${item.qty}</span></div>
        </div>
        <div class="r-item-price">${formatRs(item.price * item.qty)}</div>
      </div>
    `;
  });
  if (receiptList) receiptList.innerHTML = itemsHtml;

  // Notes
  const notesBox = document.getElementById("receipt-notes-box");
  if (details.notes) {
    if (notesBox) {
      notesBox.style.display = "block";
      notesBox.innerHTML = `<strong>Special Instructions:</strong> ${details.notes}`;
    }
  } else {
    if (notesBox) notesBox.style.display = "none";
  }

  // Open modal
  receiptOverlay?.classList.add("open");
  document.body.style.overflow = "hidden";

  // Reset cart after successful order
  cart = [];
  persistCart();
  renderCart();

  if (details.type === "Takeaway") {
    showToast(`🎉 Takeaway Order ${details.orderId} Confirmed!`, "🛍️");
  } else {
    showToast(`🎉 Dine-In Order ${details.orderId} Confirmed!`, "🍽️");
  }
}

function closeReceipt() {
  receiptOverlay?.classList.remove("open");
  document.body.style.overflow = "";
}

receiptTopClose?.addEventListener("click", closeReceipt);
closeReceiptBtn?.addEventListener("click", closeReceipt);
printReceiptBtn?.addEventListener("click", () => {
  window.print();
});

// Initialize on page load
setOrderMode(orderMode);
setPaymentMethod(paymentMethod);
renderCart();
