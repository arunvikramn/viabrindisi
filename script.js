/* CONFIGURATION
   1. Open your Google Sheet.
   2. Go to File > Share > Publish to Web.
   3. Select "Entire Document" and "Comma-separated values (.csv)".
   4. Copy that link and paste it inside the quotes below.
*/
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQZrbNK-Y3H1OWq5cQTSmYAuBxMISZf39T_60rGFjBvAHpfBUhvajTnh4QYbzce8F3yezjXZIll0Zvh/pub?output=csv"; 

// --- STATE MANAGEMENT ---
let allBooks = [];

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
            </div>
        `;
        
        grid.appendChild(card);
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