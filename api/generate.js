const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

function formatTanggalIndo(dateStr) {
  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const date = new Date(dateStr);
  const tgl = date.getDate();
  const bln = bulanIndo[date.getMonth()];
  return `${tgl} ${bln}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const {
      invoice_number,
      customer_name,
      phone,
      address,
      opsi_pengiriman,
      delivery_date,
      product_name,
      qty,
      price,
      discount_name,
      discount_amount
    } = req.body;

    const today = new Date();
    const formattedDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    const invoice_code = `#${formattedDate}${invoice_number}`;
    const opsi_pengiriman_str = `${opsi_pengiriman}, ${delivery_date ? formatTanggalIndo(delivery_date) : ''}`;
    const year = today.getFullYear();
    const tanggalHariIni = `${formatTanggalIndo(today)} , ${year}`;
    const discount = parseFloat(discount_amount || 0);

    const items = [];
    let sub_total = 0;
    let grand_total = 0;

    for (let i = 0; i < product_name.length; i++) {
      const quantity = parseFloat(qty[i]);
      const unit_price = parseFloat(price[i]);
      const total = quantity * unit_price;

      items.push({ name: product_name[i], quantity, unit_price, total });
      grand_total += total;
    }
    sub_total = grand_total;
    grand_total -= discount;

    // Base64 logo
    const logoPath = path.join(process.cwd(), 'public/images/logo.png');
    const base64Logo = fs.readFileSync(logoPath, { encoding: 'base64' });

    const invoiceData = {
      tanggalHariIni,
      base64Logo,
      invoice_code,
      customer_name,
      phone,
      address,
      opsi_pengiriman_str,
      items,
      discount_name,
      discount_amount: discount,
      sub_total,
      grand_total
    };

    const html = await ejs.renderFile(path.join(process.cwd(), 'public/template/pdf.ejs'), invoiceData);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '10mm', left: '15mm', right: '15mm' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=INVOICE-${invoice_code}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to generate invoice');
  }
};
