const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

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


router.post('/invoice', async (req, res) => {
    try{
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

        // const base64Logo = '../images/logo.png';
        const logoPath = path.join(__dirname, '../public/images/logo.png');
        const base64Logo = fs.readFileSync(logoPath, { encoding: 'base64' });
        // const base64Logo = fs.readFileSync('../images/logo.png', { encoding: 'base64' });
        // data.base64Logo = base64Logo; 


        // Generate invoice code
        const today = new Date();
        const formattedDate = today.toISOString().slice(0, 10).replace(/-/g, ''); // e.g., 20250720
        const invoice_code = `#${formattedDate}${invoice_number}`;

        const opsi_pengiriman_str = `${opsi_pengiriman}, ${delivery_date ? formatTanggalIndo(delivery_date) : ''}`;

        const year=today.getFullYear();
        const tanggalHariIni = `${formatTanggalIndo(today)} , ${year}`;

        const discount = parseFloat(discount_amount || 0);

        const items = [];   
        
        let sub_total=0;
        let grand_total = 0;

        for (let i = 0; i < product_name.length; i++) {
            const quantity = parseFloat(qty[i]);
            const unit_price = parseFloat(price[i]);
            const total = quantity * unit_price;

            items.push({
                name: product_name[i],
                quantity,
                unit_price,
                total
            });

            grand_total += total;
        }
        sub_total = grand_total;
        grand_total -= discount;

        console.log("Parsed Items:\n", items);
        console.log("Discount:", discount_name, discount);
        console.log("Final Total:", grand_total);

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

        // res.render('../public/template/pdf.ejs', invoiceData);

        const html = await ejs.renderFile(
            path.join(__dirname, '../public/template/pdf.ejs'),
            invoiceData
        );

        // 🖨️ Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('screen');

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                bottom: '10mm',
                left: '15mm',
                right: '15mm'
            }
        });

        await browser.close();

         res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=INVOICE-${invoice_code}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        return res.send(pdfBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
