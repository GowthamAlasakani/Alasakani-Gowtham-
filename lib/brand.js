const fs = require('fs');
const path = require('path');

// Defaults come from the public listing for the Lake Mary location; override with env vars.
const brand = {
  name: process.env.BUSINESS_NAME || 'Nawabi Hyderabad House',
  tagline: process.env.BUSINESS_TAGLINE || 'Indian Cuisine · Biryani Place',
  address: process.env.BUSINESS_ADDRESS || '4225 W Lake Mary Blvd, Lake Mary, FL 32746',
  phone: process.env.BUSINESS_PHONE || '(407) 576-0957',
  website: process.env.BUSINESS_WEBSITE || 'https://nawabihhlakemary.com',
  hours: process.env.BUSINESS_HOURS || 'Mon–Thu & Sun 11am–10pm · Fri–Sat 11am–11pm',
};
brand.tel = 'tel:+1' + brand.phone.replace(/\D/g, '').replace(/^1/, '');
brand.mapUrl = 'https://maps.google.com/?q=' + encodeURIComponent(brand.address);

// Drop your logo into public/ as logo.png, logo.jpg, logo.svg or logo.webp.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
brand.logoFile = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.svg', 'logo.webp']
  .find((f) => fs.existsSync(path.join(PUBLIC_DIR, f)));
brand.logoUrl = brand.logoFile ? '/' + brand.logoFile : '';

module.exports = { brand, PUBLIC_DIR };
