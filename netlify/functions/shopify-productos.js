const https = require('https');

const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE = '2seg9c-gn';

function fetchJSON(url, token) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    };
    https.get(url, options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

exports.handler = async () => {
  try {
    const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2024-01/products.json?limit=250&status=active`;
    const data = await fetchJSON(url, SHOPIFY_TOKEN);
    if (!data || !data.products) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudieron traer los productos' }) };
    }

    const productos = data.products.map(p => ({
      id: p.id,
      nombre: p.title,
      descripcion: p.body_html ? p.body_html.replace(/<[^>]*>/g, '').slice(0, 150) : '',
      precio: parseFloat(p.variants[0]?.price || 0),
      imagenes: p.images.map(img => img.src),
      variantes: p.variants.map(v => ({
        id: v.id,
        titulo: v.title,
        precio: parseFloat(v.price || 0),
        sku: v.sku || '',
        disponible: v.inventory_quantity > 0
      }))
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(productos)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
