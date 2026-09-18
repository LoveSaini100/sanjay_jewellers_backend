const bcrypt = require('bcryptjs');
const {
  categoriesData,
  collectionsData,
  productsData,
  sampleEnquiries,
  sampleAppointments,
} = require('../seed/seedData');

// Generate mock MongoDB-like ObjectIDs
const generateId = () => {
  const timestamp = ((new Date().getTime() / 1000) | 0).toString(16);
  return (
    timestamp +
    'xxxxxxxxxxxxxxxx'
      .replace(/[x]/g, () => ((Math.random() * 16) | 0).toString(16))
      .toLowerCase()
  );
};

// Initial in-memory state
let isInitialized = false;

let users = [];
let categories = [];
let collections = [];
let products = [];
let enquiries = [];
let appointments = [];

const initializeMockStore = () => {
  if (isInitialized) return;

  // 1. Admin
  const adminPasswordHash = bcrypt.hashSync('@sanjayjewellers2026', 10);
  users = [
    {
      _id: generateId(),
      name: 'Showroom Director',
      email: 'admin@sanjayjewellers.com',
      password: adminPasswordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
  ];

  // 2. Categories
  const catMap = {};
  categories = categoriesData.map((cat, idx) => {
    const id = generateId();
    catMap[cat.slug] = id;
    return {
      _id: id,
      ...cat,
      order: cat.order || idx + 1,
      createdAt: new Date().toISOString(),
    };
  });

  // 3. Collections
  const colMap = {};
  collections = collectionsData.map((col) => {
    const id = generateId();
    colMap[col.slug] = id;
    return {
      _id: id,
      ...col,
      createdAt: new Date().toISOString(),
    };
  });

  // 4. Products
  products = productsData.map((prod) => {
    const id = generateId();
    const catId = catMap[prod.categorySlug] || categories[0]._id;
    const colId = prod.collectionSlug ? colMap[prod.collectionSlug] : null;
    const catObj = categories.find((c) => c._id === catId);
    const colObj = collections.find((c) => c._id === colId);

    const { categorySlug, collectionSlug, ...rest } = prod;
    return {
      _id: id,
      ...rest,
      category: catObj ? { _id: catObj._id, name: catObj.name, slug: catObj.slug } : null,
      collectionRef: colObj ? { _id: colObj._id, name: colObj.name, slug: colObj.slug } : null,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString(),
    };
  });

  // 5. Enquiries
  enquiries = sampleEnquiries.map((enq, idx) => {
    const prod = products[idx % products.length];
    return {
      _id: generateId(),
      ...enq,
      product: prod ? { _id: prod._id, name: prod.name, sku: prod.sku, price: prod.price, images: prod.images } : null,
      createdAt: new Date(Date.now() - (idx + 1) * 3600000 * 8).toISOString(),
    };
  });

  // 6. Appointments
  appointments = sampleAppointments.map((app, idx) => ({
    _id: generateId(),
    ...app,
    createdAt: new Date(Date.now() - (idx + 1) * 3600000 * 12).toISOString(),
  }));

  isInitialized = true;
  console.log('⚡ High-performance In-Memory Jewel Store initialized with 12+ luxury items, categories, collections, and sample inquiries.');
};

initializeMockStore();

module.exports = {
  getUsers: () => users,
  setUsers: (val) => (users = val),
  getCategories: () => categories,
  setCategories: (val) => (categories = val),
  getCollections: () => collections,
  setCollections: (val) => (collections = val),
  getProducts: () => products,
  setProducts: (val) => (products = val),
  getEnquiries: () => enquiries,
  setEnquiries: (val) => (enquiries = val),
  getAppointments: () => appointments,
  setAppointments: (val) => (appointments = val),
  generateId,
};
