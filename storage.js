const STORAGE_KEYS = {
  PRODUCTS: 'ims_products'
};

//gets all products from localStorage
function getProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse products JSON', e);
    return [];
  }
}

//saves all products to localStorage
function saveProducts(products) {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

//adds a product
function addProduct(product) {
  const now = new Date().toISOString();
  const products = getProducts();
  products.push({ ...product, updatedAt: now });
  saveProducts(products);
}

//updates a product
function updateProduct(updated) {
  const now = new Date().toISOString();
  const products = getProducts().map(p =>
    p.id === updated.id
      ? { ...p, ...updated, updatedAt: now, dateAdded: p.dateAdded || updated.dateAdded }
      : p
  );
  saveProducts(products);
}

//delete product by id
function deleteProduct(id) {
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
}

//find a product by id
function findProduct(id) {
  return getProducts().find(p => p.id === id) || null;
}

//Seed demo data
function seedDemoProducts() {
  const existing = getProducts();
  if (existing.length > 0) return;
  const today = new Date().toISOString().slice(0,10);
  const now = new Date().toISOString();
  saveProducts([
    { id: Date.now(),     name:'Wireless Mouse', sku:'MSE-100', price:12.99, quantity:25, category:'Electronics', dateAdded:today, updatedAt:now },
    { id: Date.now() + 1, name:'Office Chair',   sku:'CHR-200', price:89.5,  quantity:7,  category:'Furniture',   dateAdded:today, updatedAt:now },
    { id: Date.now() + 2, name:'T-Shirt',        sku:'TSH-300', price:9.99,  quantity:60, category:'Clothing',    dateAdded:today, updatedAt:now }
  ]);

}

//vendors storage
const VENDORS_KEY = 'ims_vendors';

function getVendors() {
  try {
    const raw = localStorage.getItem(VENDORS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveVendors(list) {
  localStorage.setItem(VENDORS_KEY, JSON.stringify(list));
}

function addVendor(vendor) {
  const now = new Date().toISOString();
  const list = getVendors();
  const id = Date.now();
  list.push({ id, createdAt: now, updatedAt: now, ...vendor });
  saveVendors(list);
  return id;
}

function findVendor(id) {
  const num = Number(id);
  return getVendors().find(v => v.id === num);
}

function updateVendor(updated) {
  const now = new Date().toISOString();
  const list = getVendors().map(v =>
    v.id === updated.id ? { ...v, ...updated, updatedAt: now } : v
  );
  saveVendors(list);
}

function deleteVendor(id) {
  const num = Number(id);
  const list = getVendors().filter(v => v.id !== num);
  saveVendors(list);
}

function seedDemoVendors() {
  const existing = getVendors();
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  saveVendors([
    { id: Date.now(),     name:'Ahmed',     contactName:'Ahmed',   email:'Ahmed@gmail.com',   phone:'+90-0583058565-0101', address:'100 st TR', createdAt: now, updatedAt: now },
    { id: Date.now() + 1, name:'Ercan', contactName:'Ercan', email:'Ercan@gmail.com', phone:'+90-0539555-0202', address:'55 TR STE', createdAt: now, updatedAt: now }
  ]);
}




//purchase Orders storage
const PO_KEY = 'ims_pos';
const POL_KEY = 'ims_po_lines';

function getPOs() {
  try { return JSON.parse(localStorage.getItem(PO_KEY)) || []; } catch { return []; }
}
function savePOs(list) { localStorage.setItem(PO_KEY, JSON.stringify(list)); }

function getPOLines() {
  try { return JSON.parse(localStorage.getItem(POL_KEY)) || []; } catch { return []; }
}
function savePOLines(list) { localStorage.setItem(POL_KEY, JSON.stringify(list)); }

function addPO(header, lines) {
  const now = new Date().toISOString();
  const id = Date.now();

  //resolves vendor
  const v = findVendor(header.vendorId);
  const vendorName = v ? v.name : 'Unknown Vendor';

  //builds lines with product data and totals
  const pols = getPOLines();
  const lineRecords = lines.map((ln, idx) => {
    const p = findProduct(ln.productId);
    const productName = p ? p.name : 'Unknown Product';
    const qty = Number(ln.qty) || 0;
    const unitPrice = Number(ln.unitPrice) || 0;
    const lineTotal = Number((qty * unitPrice).toFixed(2));
    return {
      id: Date.now() + idx + 1,
      poId: id,
      productId: ln.productId,
      productName,
      qty, unitPrice, lineTotal
    };
  });

  const total = Number(lineRecords.reduce((sum, r) => sum + r.lineTotal, 0).toFixed(2));

  const po = {
    id,
    vendorId: header.vendorId,
    vendorName,
    date: header.date || now,
    status: header.status || 'Draft',
    notes: header.notes || '',
    total,
    createdAt: now, updatedAt: now
  };

  const pos = getPOs();
  pos.push(po); savePOs(pos);
  pols.push(...lineRecords); savePOLines(pols);
  return id;
}

function findPO(id) {
  const num = Number(id);
  return getPOs().find(p => p.id === num);
}

function getLinesForPO(poId) {
  const num = Number(poId);
  return getPOLines().filter(l => l.poId === num);
}

function updatePO(updatedHeader) {
  const now = new Date().toISOString();
  const pos = getPOs().map(p => p.id === updatedHeader.id ? { ...p, ...updatedHeader, updatedAt: now } : p);
  savePOs(pos);
}

function deletePO(id) {
  const num = Number(id);
  const pos = getPOs().filter(p => p.id !== num);
  savePOs(pos);
  const pols = getPOLines().filter(l => l.poId !== num);
  savePOLines(pols);
}

function seedDemoPOs() {
  const pos = getPOs();
  if (pos.length) return;
  const vendors = getVendors();
  const products = getProducts();
  if (!vendors.length || !products.length) return;

  const v = vendors[0];
  const lines = products.slice(0, Math.min(3, products.length)).map((p, i) => ({
    productId: p.id,
    qty: 5 + i,
    unitPrice: Number(p.price) || 0
  }));
  addPO({ vendorId: v.id, date: new Date().toISOString().slice(0,10), status: 'Draft', notes: 'Seed order' }, lines);
}

const LOG_KEY = 'ims_logs';

function getLogs() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch { return []; }
}
function saveLogs(list) { localStorage.setItem(LOG_KEY, JSON.stringify(list)); }

function addLog(message) {
  const logs = getLogs();
  logs.push({ id: Date.now(), message, time: new Date().toISOString() });
  saveLogs(logs);
}

