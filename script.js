/* CONFIGURATION
   1. Open your Google Sheet.
   2. Go to File > Share > Publish to Web.
   3. Select "Entire Document" and "Comma-separated values (.csv)".
   4. Copy that link and paste it inside the quotes below.
*/
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQZrbNK-Y3H1OWq5cQTSmYAuBxMISZf39T_60rGFjBvAHpfBUhvajTnh4QYbzce8F3yezjXZIll0Zvh/pub?output=csv"; 
// Configure these before using checkout:
const GOOGLE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwuMilm-OenaBiuKgU293xh_MoP8MGlPTjwEaN6nK9y4ja8lUNsEvKDF4OH03yuTVyF/exec"; 
const MERCHANT_UPI_ID = "9447447007@upi";

// --- STATE MANAGEMENT ---
let allBooks = [];
let cart = [];

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    if (SHEET_URL.includes("YOUR_GOOGLE_SHEET")) {
        // If user hasn't put their link yet, load sample data so the screen isn't empty
        console.warn("No Sheet URL found. Loading Demo Data.");
        loadDemoData();
    } else {
        fetchData();
    }

    // Attach event listeners for search and filter
    document.getElementById('searchInput').addEventListener('input', filterBooks);
    document.getElementById('categoryFilter').addEventListener('change', filterBooks);
    // Cart UI handlers
    document.getElementById('openCart').addEventListener('click', openCart);
    document.getElementById('closeCart').addEventListener('click', closeCart);
    document.getElementById('checkoutBtn').addEventListener('click', showCheckoutForm);
    document.getElementById('cancelCheckout').addEventListener('click', () => { document.getElementById('checkoutForm').style.display='none'; });
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
});

// --- DATA FETCHING ---
function fetchData() {
    Papa.parse(SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            allBooks = results.data;
            populateCategories(allBooks);
            renderBooks(allBooks);
        },
        error: function(err) {
            console.error("Error fetching sheet:", err);
            document.getElementById('bookGrid').innerHTML = "<p>Error loading library. Please check console.</p>";
        }
    });
}

// --- RENDER FUNCTIONS ---
function renderBooks(books) {
    const grid = document.getElementById('bookGrid');
    grid.innerHTML = ""; // Clear current list

    if (books.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center;'>No books found matching criteria.</p>";
        return;
    }

    books.forEach(book => {
        // Safe Checks for empty data
        if(!book.BookName) return; 

        // Calculation Logic
        const originalPrice = parseFloat(book.Amount);
        const discount = parseFloat(book.Discount) || 0;
        const finalPrice = discount > 0 
            ? originalPrice - (originalPrice * (discount / 100)) 
            : originalPrice;
        
        // Image Handler (Fix Google Drive Links)
        const imageUrl = fixDriveLink(book.BookCover) || 'https://via.placeholder.com/300x400?text=No+Cover';
        
        // Status Handler
        const isSold = book.Status && book.Status.toLowerCase() === 'sold';
        const soldOverlay = isSold 
            ? `<div class="status-sold"><div class="sold-badge">SOLD</div></div>` 
            : '';
        const cardClass = isSold ? 'book-card sold' : 'book-card';

        // Price HTML Logic
        let priceHtml = '';
        if (discount > 0 && !isSold) {
            priceHtml = `
                <div>
                    <span class="original-price">₹${originalPrice.toLocaleString()}</span>
                    <span class="discount-badge">-${discount}%</span>
                </div>
                <div class="price">₹${finalPrice.toLocaleString()}</div>
            `;
        } else {
            priceHtml = `<div class="price">₹${originalPrice.toLocaleString()}</div>`;
        }

        // Create HTML Element
        const card = document.createElement('div');
        card.className = cardClass;
        card.innerHTML = `
            ${soldOverlay}
            <div class="card-image">
                <img src="${imageUrl}" alt="${book.BookName}" loading="lazy">
            </div>
            <div class="card-details">
                <div class="card-category">${book.Category || 'General'}</div>
                <h3 class="card-title serif">${book.BookName}</h3>
                <div class="card-author">by ${book.Author}</div>
                
                <div class="card-meta">
                    <span>${book.Year}</span>
                    <span>${book.Condition}</span>
                </div>

                <div class="card-price-area">
                    ${priceHtml}
                </div>
                <div style="margin-top:10px;">
                    ${isSold ? '' : `<button class="primary add-to-cart" data-id="${book.ID}">Add to cart</button>`}
                </div>
            </div>
        `;
        
        grid.appendChild(card);
        // Attach add-to-cart handler
        if(!isSold){
            const btn = card.querySelector('.add-to-cart');
            if(btn) btn.addEventListener('click', () => addToCart(book));
        }
    });
}

// --- FILTER LOGIC ---
function populateCategories(books) {
    const categories = new Set();
    books.forEach(book => {
        if(book.Category) categories.add(book.Category.trim());
    });
    
    const select = document.getElementById('categoryFilter');
    // Keep the "All" option, clear others
    select.innerHTML = '<option value="All">All Categories</option>';
    
    Array.from(categories).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function filterBooks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    const filtered = allBooks.filter(book => {
        const matchesSearch = (
            (book.BookName && book.BookName.toLowerCase().includes(searchTerm)) ||
            (book.Author && book.Author.toLowerCase().includes(searchTerm))
        );
        const matchesCategory = category === 'All' || book.Category === category;

        return matchesSearch && matchesCategory;
    });

    renderBooks(filtered);
}

// --- UTILITIES ---
function fixDriveLink(url) {
    if (!url) return null;
    // Converts "open?id=" or "file/d/" to "uc?export=view&id="
    if (url.includes("drive.google.com")) {
        const idMatch = url.match(/\/d\/(.*?)\/|id=(.*?)(&|$)/);
        const id = idMatch ? (idMatch[1] || idMatch[2]) : null;
        if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    }
    return url;
}

// --- DEMO DATA (Fallback if no sheet linked) ---
function loadDemoData() {
    allBooks = [
        { ID: "1", BookName: "Postal History of Travancore", Author: "N.S. Mooss", Category: "Princely States", Condition: "USED - FINE", Year: "1984", Amount: "4500", Discount: "0", BookCover: "", Status: "Available" },
        { ID: "2", BookName: "India: The 1854 Lithographs", Author: "D.R. Martin", Category: "British India", Condition: "USED - GOOD", Year: "1928", Amount: "12000", Discount: "10", BookCover: "", Status: "Available" },
        { ID: "3", BookName: "The Scinde Dawk", Author: "L.E. Dawson", Category: "British India", Condition: "USED - FINE", Year: "1968", Amount: "3500", Discount: "0", BookCover: "", Status: "Sold" },
        { ID: "4", BookName: "Maritime Mail of the Indian Ocean", Author: "Philip Cockrill", Category: "Maritime", Condition: "NEW", Year: "1987", Amount: "3200", Discount: "15", BookCover: "", Status: "Available" }
    ];
    populateCategories(allBooks);
    renderBooks(allBooks);
}

// --- CART HANDLERS ---
function addToCart(book){
    const id = book.ID || (book.BookName + '::' + book.Author);
    const existing = cart.find(i=>i.id===id);
    const price = calculatePrice(book);
    if(existing){ existing.qty += 1; existing.total = existing.qty * price; }
    else cart.push({ id, book, qty:1, unit: price, total: price });
    updateCartUI();
}

function calculatePrice(book){
    const original = parseFloat(book.Amount)||0;
    const discount = parseFloat(book.Discount)||0;
    return discount>0 ? original - (original*(discount/100)) : original;
}

function updateCartUI(){
    document.getElementById('cartCount').textContent = cart.reduce((s,i)=>s+i.qty,0);
    const container = document.getElementById('cartItems');
    container.innerHTML='';
    cart.forEach(item=>{
        const div = document.createElement('div'); div.className='cart-item';
        div.innerHTML = `
            <img src="${fixDriveLink(item.book.BookCover)||'https://via.placeholder.com/80x100?text=No'}" />
            <div class="meta"><strong>${item.book.BookName}</strong><div style="font-size:0.9rem;color:#666">by ${item.book.Author}</div></div>
            <div style="text-align:right">
                <div>₹${item.unit.toLocaleString()}</div>
                <div style="margin-top:6px">Qty: <input type="number" min="1" value="${item.qty}" style="width:56px" data-id="${item.id}" class="cart-qty"></div>
                <div style="margin-top:6px"><button data-id="${item.id}" class="remove-item">Remove</button></div>
            </div>
        `;
        container.appendChild(div);
    });
    // attach qty/change handlers
    container.querySelectorAll('.cart-qty').forEach(inp=>{
        inp.addEventListener('change', (e)=>{
            const id = e.target.dataset.id; const v = parseInt(e.target.value)||1;
            const it = cart.find(x=>x.id===id); if(it){ it.qty = v; it.total = it.qty*it.unit; updateCartUI(); }
        });
    });
    container.querySelectorAll('.remove-item').forEach(btn=>{ btn.addEventListener('click', ()=>{ const id=btn.dataset.id; cart=cart.filter(x=>x.id!==id); updateCartUI(); }); });
    const total = cart.reduce((s,i)=>s+i.total,0);
    document.getElementById('cartTotal').textContent = `₹${total.toLocaleString()}`;
}

function openCart(){ document.getElementById('cartModal').setAttribute('aria-hidden','false'); }
function closeCart(){ document.getElementById('cartModal').setAttribute('aria-hidden','true'); document.getElementById('checkoutForm').style.display='none'; }

function showCheckoutForm(){
    if(cart.length===0){ alert('Your cart is empty'); return; }
    document.getElementById('checkoutForm').style.display='block';
    document.getElementById('paymentArea').innerHTML = '';
    // default country selection updates payment area
    document.getElementById('buyerCountry').addEventListener('change', updatePaymentArea);
    updatePaymentArea();
}

function updatePaymentArea(){
    const country = document.getElementById('buyerCountry').value;
    const area = document.getElementById('paymentArea');
    area.innerHTML = '';
    const total = cart.reduce((s,i)=>s+i.total,0).toFixed(2);
    if(country === 'India'){
        // UPI flow: show UPI id, deep-link and copy button
        area.innerHTML = `
            <p>Pay using UPI to <strong>${MERCHANT_UPI_ID}</strong></p>
            <p>Total payable: <strong>₹${parseFloat(total).toLocaleString()}</strong></p>
            <p><button id="copyUpi">Copy UPI ID</button> <button id="upiPayLink">Open UPI App</button></p>
            <p style="font-size:0.9rem;color:#555">After payment, please click "Place Order" and paste the UPI Txn reference in the confirmation email when prompted.</p>
        `;
        document.getElementById('copyUpi').addEventListener('click', ()=>navigator.clipboard.writeText(MERCHANT_UPI_ID));
        document.getElementById('upiPayLink').addEventListener('click', ()=>{
            const upi = `upi://pay?pa=${encodeURIComponent(MERCHANT_UPI_ID)}&pn=${encodeURIComponent('ViaBrindisi')}&am=${encodeURIComponent(total)}&cu=INR`;
            window.location.href = upi;
        });
    } else {
        // Wise flow: request invoice from merchant (backend will email customer)
        area.innerHTML = `
            <p>For international orders we use Wise. Click "Place Order" to request a Wise invoice from the merchant.</p>
            <p>Total (INR): <strong>₹${parseFloat(total).toLocaleString()}</strong></p>
        `;
    }
}

async function placeOrder(){
    const name = document.getElementById('buyerName').value || '';
    const email = document.getElementById('buyerEmail').value || '';
    const addr = document.getElementById('buyerAddress').value || '';
    const country = document.getElementById('buyerCountry').value || 'India';
    if(!name || !email){ alert('Please enter name and email'); return; }
    const total = cart.reduce((s,i)=>s+i.total,0);
    const items = cart.map(i=>({ id:i.id, title:i.book.BookName, qty:i.qty, unit:i.unit })).slice(0,100);
    const payload = {
        OrderID: 'ORD' + Date.now(),
        Name: name,
        Email: email,
        Address: addr,
        Country: country,
        Items: JSON.stringify(items),
        TotalAmount: total.toFixed(2),
        PaymentMethod: (country==='India' ? 'UPI' : 'Wise')
    };

    // If webhook is configured, send order to Google Apps Script for merchant emails/invoice
    if(GOOGLE_WEBHOOK_URL){
        try{
            const res = await fetch(GOOGLE_WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            const txt = await res.text();
            document.getElementById('checkoutMsg').textContent = 'Order placed. Merchant will contact you with payment instructions.';
            cart = []; updateCartUI();
            setTimeout(()=>{ closeCart(); }, 2000);
            return;
        }catch(err){ console.error(err); document.getElementById('checkoutMsg').textContent = 'Failed to notify merchant. Please email the details to the seller.'; }
    }

    // If webhook missing, provide fallback instructions
    if(country==='India'){
        document.getElementById('checkoutMsg').textContent = `No webhook configured. Please pay ₹${total.toFixed(2)} to ${MERCHANT_UPI_ID} via UPI and email ${email} with your order details.`;
    } else {
        document.getElementById('checkoutMsg').textContent = `No webhook configured. Please email the seller to request a Wise invoice.`;
    }
}